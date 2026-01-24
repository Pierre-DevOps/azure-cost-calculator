// Calculateur Azure Intelligent - Connexion à l'API Flask
class AzureCostCalculator {
    constructor() {
        this.currentConfig = null;
        this.currentCosts = null;
        this.optimizedCosts = null;
        this.charts = {};
        this.isCalculating = false;
        this.API_BASE = '/api'; // Votre API Flask
    }

    init() {
        this.bindEvents();
        this.initCharts();
        this.calculateCosts();
        this.showNotification('Calculateur Azure Intelligent prêt !', 'success');
    }

    bindEvents() {
        // Bouton calcul principal
        document.getElementById('calculateBtn').addEventListener('click', () => this.calculateCosts());
        
        // Bouton optimisation
        document.getElementById('optimizeBtn').addEventListener('click', () => this.optimizeCosts());
        
        // Bouton réinitialisation
        document.getElementById('resetBtn').addEventListener('click', () => this.resetToDefaults());
        
        // Sliders et inputs en temps réel
        const inputs = ['vmCount', 'vmHours', 'aksNodes', 'storageSize'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updatePreviews());
            }
        });
        
        // Selects
        const selects = ['vmSize', 'aksSize', 'storageType', 'dbType', 'dbSize'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.updatePreviews());
            }
        });
        
        // Checkboxes
        document.getElementById('backupEnabled').addEventListener('change', () => this.updatePreviews());
        document.getElementById('dbBackup').addEventListener('change', () => this.updatePreviews());
        
        // Tabs des graphiques
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchChartTab(e));
        });
        
        // Actions rapides
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyQuickAction(e));
        });
        
        // Boutons d'export et aide
        document.getElementById('exportBtn').addEventListener('click', () => this.exportResults());
        document.getElementById('helpBtn').addEventListener('click', () => this.showHelp());
        document.getElementById('contactBtn').addEventListener('click', () => this.showContact());
    }

    getConfig() {
        return {
            vm: {
                size: document.getElementById('vmSize').value,
                count: parseInt(document.getElementById('vmCount').value) || 2,
                hours: parseInt(document.getElementById('vmHours').value) || 24
            },
            aks: {
                size: document.getElementById('aksSize').value,
                nodes: parseInt(document.getElementById('aksNodes').value) || 3,
                utilization: 0.8 // Valeur par défaut
            },
            storage: {
                type: document.getElementById('storageType').value,
                size: parseInt(document.getElementById('storageSize').value) || 256,
                backup: document.getElementById('backupEnabled').checked
            },
            database: {
                type: document.getElementById('dbType').value,
                size: document.getElementById('dbSize').value,
                backup: document.getElementById('dbBackup').checked
            }
        };
    }

    async calculateCosts() {
        if (this.isCalculating) return;
        
        this.isCalculating = true;
        this.showLoading();
        
        try {
            const config = this.getConfig();
            this.currentConfig = config;
            
            // Appel à l'API Flask
            const response = await fetch(this.API_BASE + '/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            this.currentCosts = data;
            
            // Mise à jour de l'interface
            this.updateCostDisplay(data);
            this.updateCharts(data);
            this.generateRecommendations(data);
            this.calculateHiddenCosts();
            
            // Calcul de l'optimisation
            await this.calculateOptimizedCosts(config);
            
            this.showNotification('Calcul terminé avec succès !', 'success');
            
        } catch (error) {
            console.error('Error calculating costs:', error);
            this.showNotification('Erreur lors du calcul. Utilisation des valeurs par défaut.', 'error');
            this.useFallbackCalculations();
        } finally {
            this.isCalculating = false;
            this.hideLoading();
        }
    }

    async calculateOptimizedCosts(config) {
        try {
            // Crée une configuration optimisée
            const optimizedConfig = JSON.parse(JSON.stringify(config));
            
            // Optimisations automatiques
            if (optimizedConfig.vm.hours > 12) {
                optimizedConfig.vm.hours = 12;
            }
            
            if (optimizedConfig.aks.nodes > 2) {
                optimizedConfig.aks.nodes = 2;
            }
            
            if (optimizedConfig.storage.type === 'Premium_LRS' && optimizedConfig.database.type !== 'cosmos_db') {
                optimizedConfig.storage.type = 'Standard_GRS';
            }
            
            // Appel API pour les coûts optimisés
            const response = await fetch(this.API_BASE + '/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(optimizedConfig)
            });
            
            if (response.ok) {
                this.optimizedCosts = await response.json();
                this.updateComparisonChart();
            }
            
        } catch (error) {
            console.error('Error calculating optimized costs:', error);
        }
    }

    updateCostDisplay(costs) {
        const formatter = new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        // Coût total
        document.getElementById('totalCost').textContent = formatter.format(costs.total);
        
        // Détails
        document.getElementById('vmCostDetail').textContent = `VMs: ${formatter.format(costs.vm || 0)}`;
        document.getElementById('storageCostDetail').textContent = `Stockage: ${formatter.format(costs.storage || 0)}`;
        
        // Calcul des économies
        if (this.optimizedCosts && costs.total > 0) {
            const savings = costs.total - this.optimizedCosts.total;
            const percent = ((savings / costs.total) * 100).toFixed(1);
            
            document.getElementById('potentialSavings').textContent = formatter.format(savings);
            document.getElementById('savingsPercent').textContent = `${percent}%`;
            
            // Mise à jour des actions rapides
            document.getElementById('savingsHours').textContent = formatter.format(costs.vm * 0.3);
            document.getElementById('savingsStorage').textContent = formatter.format(costs.storage * 0.2);
            document.getElementById('savingsAKS').textContent = formatter.format((costs.aks || 0) * 0.25);
        }
    }

    updatePreviews() {
        // Mise à jour en temps réel des prévisualisations
        const config = this.getConfig();
        
        // Prévisualisation VM
        const vmCost = config.vm.count * config.vm.hours * 0.12 * 30; // Estimation
        document.getElementById('vmCostPreview').textContent = `€${vmCost.toFixed(2)}/mois`;
        
        // Prévisualisation AKS
        const aksCost = config.aks.nodes * 24 * 0.08 * 30; // Estimation
        document.getElementById('aksCostPreview').textContent = `€${aksCost.toFixed(2)}/mois`;
        
        // Prévisualisation stockage
        document.getElementById('storageSizeValue').textContent = `${config.storage.size} GB`;
        const storageCost = config.storage.size * 0.12;
        document.getElementById('storageCostPreview').textContent = `€${storageCost.toFixed(2)}/mois`;
        
        // Prévisualisation DB
        const dbCost = config.database.type === 'none' ? 0 : 
                      config.database.type === 'sql_basic' ? 5.99 :
                      config.database.type === 'sql_standard' ? 14.99 : 24.99;
        document.getElementById('dbCostPreview').textContent = `€${dbCost.toFixed(2)}/mois`;
    }

    initCharts() {
        const ctx1 = document.getElementById('costDistributionChart')?.getContext('2d');
        const ctx2 = document.getElementById('comparisonChart')?.getContext('2d');
        
        if (ctx1) {
            this.charts.distribution = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: ['Machines Virtuelles', 'Kubernetes', 'Stockage', 'Base de données', 'Coûts cachés'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: [
                            '#0078D4', // Bleu Azure
                            '#00BCF2', // Bleu clair
                            '#107C10', // Vert
                            '#FFB900', // Jaune/Or
                            '#E81123'  // Rouge
                        ],
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                        hoverOffset: 20
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                padding: 20,
                                usePointStyle: true,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: €${value.toFixed(2)} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        }
        
        if (ctx2) {
            this.charts.comparison = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: ['Configuration actuelle', 'Configuration optimisée'],
                    datasets: [{
                        label: 'Coût mensuel (€)',
                        data: [0, 0],
                        backgroundColor: ['#0078D4', '#107C10'],
                        borderRadius: 8,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)'
                            },
                            ticks: {
                                callback: (value) => `€${value}`
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => `Coût: €${context.parsed.y.toFixed(2)}`
                            }
                        }
                    }
                }
            });
        }
    }

    updateCharts(costs) {
        if (this.charts.distribution) {
            this.charts.distribution.data.datasets[0].data = [
                costs.vm || 0,
                costs.aks || 0,
                costs.storage || 0,
                costs.database || 0,
                costs.hidden || 0
            ];
            this.charts.distribution.update();
        }
    }

    updateComparisonChart() {
        if (this.charts.comparison && this.currentCosts && this.optimizedCosts) {
            this.charts.comparison.data.datasets[0].data = [
                this.currentCosts.total,
                this.optimizedCosts.total
            ];
            this.charts.comparison.update();
        }
    }

    generateRecommendations(costs) {
        const recommendations = [];
        const container = document.getElementById('recommendationsList');
        
        if (!container) return;
        
        // Recommandations basées sur les coûts
        if (costs.vm > 500) {
            recommendations.push({
                icon: 'server',
                title: 'Optimiser les instances VM',
                description: `Vos VMs coûtent €${costs.vm.toFixed(2)}/mois. Passez à des instances réservées pour économiser jusqu'à 72%.`,
                action: 'vm_reserved'
            });
        }
        
        if (costs.storage > 200) {
            recommendations.push({
                icon: 'database',
                title: 'Optimiser le stockage',
                description: `Votre stockage coûte €${costs.storage.toFixed(2)}/mois. Activez le nettoyage automatique et archivez les données froides.`,
                action: 'storage_cleanup'
            });
        }
        
        if (costs.hidden > 100) {
            recommendations.push({
                icon: 'eye-slash',
                title: 'Réduire les coûts cachés',
                description: `Vos coûts cachés s'élèvent à €${costs.hidden.toFixed(2)}/mois. Optimisez la bande passante et les snapshots.`,
                action: 'hidden_costs'
            });
        }
        
        if (costs.aks > 300) {
            recommendations.push({
                icon: 'cubes',
                title: 'Optimiser le cluster AKS',
                description: `Votre cluster AKS coûte €${costs.aks.toFixed(2)}/mois. Activez le scale automatique et réduisez le nombre de nodes.`,
                action: 'aks_scale'
            });
        }
        
        // Ajout de recommandations par défaut si peu de recommandations
        if (recommendations.length < 2) {
            recommendations.push({
                icon: 'clock',
                title: 'Arrêt automatique des VMs',
                description: 'Configurez l\'arrêt automatique des VMs de développement la nuit et le week-end.',
                action: 'auto_shutdown'
            });
            
            recommendations.push({
                icon: 'search',
                title: 'Audit des ressources',
                description: 'Identifiez les ressources inutilisées ou sous-utilisées.',
                action: 'audit'
            });
        }
        
        // Mise à jour de l'affichage
        container.innerHTML = '';
        
        recommendations.forEach(rec => {
            const div = document.createElement('div');
            div.className = 'recommendation-item fade-in';
            div.innerHTML = `
                <div class="recommendation-icon">
                    <i class="fas fa-${rec.icon}"></i>
                </div>
                <div class="recommendation-content">
                    <h5>${rec.title}</h5>
                    <p>${rec.description}</p>
                </div>
                <button class="btn-action" data-action="${rec.action}">
                    <i class="fas fa-check"></i> Appliquer
                </button>
            `;
            container.appendChild(div);
            
            // Ajout de l'événement
            div.querySelector('.btn-action').addEventListener('click', () => {
                this.applyRecommendation(rec.action);
            });
        });
    }

    calculateHiddenCosts() {
        // Estimation des coûts cachés
        if (!this.currentCosts) return;
        
        const hidden = this.currentCosts.total * 0.15; // 15% du total
        document.getElementById('hiddenCosts').textContent = 
            new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(hidden);
    }

    async optimizeCosts() {
        this.showLoading();
        
        try {
            const config = this.getConfig();
            
            // Appel API d'optimisation
            const response = await fetch(this.API_BASE + '/optimize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });
            
            if (response.ok) {
                const optimizedConfig = await response.json();
                
                // Applique la configuration optimisée
                this.applyOptimizedConfig(optimizedConfig);
                
                // Recalcule les coûts
                await this.calculateCosts();
                
                this.showNotification('Optimisation appliquée avec succès !', 'success');
            }
            
        } catch (error) {
            console.error('Error optimizing costs:', error);
            this.showNotification('Erreur lors de l\'optimisation.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    applyOptimizedConfig(config) {
        if (config.vm) {
            document.getElementById('vmSize').value = config.vm.size || 'D2s_v3';
            document.getElementById('vmCount').value = config.vm.count || 2;
            document.getElementById('vmHours').value = config.vm.hours || 12;
        }
        
        if (config.aks) {
            document.getElementById('aksSize').value = config.aks.size || 'D2s_v3';
            document.getElementById('aksNodes').value = config.aks.nodes || 2;
        }
        
        if (config.storage) {
            document.getElementById('storageType').value = config.storage.type || 'Standard_GRS';
            document.getElementById('storageSize').value = config.storage.size || 200;
        }
    }

    applyRecommendation(action) {
        switch (action) {
            case 'vm_reserved':
                document.getElementById('vmHours').value = 24; // Production full-time
                break;
            case 'storage_cleanup':
                const currentSize = parseInt(document.getElementById('storageSize').value);
                document.getElementById('storageSize').value = Math.max(32, Math.floor(currentSize * 0.8));
                break;
            case 'aks_scale':
                document.getElementById('aksNodes').value = 2;
                break;
            case 'auto_shutdown':
                document.getElementById('vmHours').value = 10;
                break;
        }
        
        this.calculateCosts();
        this.showNotification('Recommandation appliquée !', 'success');
    }

    resetToDefaults() {
        document.getElementById('vmSize').value = 'D2s_v3';
        document.getElementById('vmCount').value = 2;
        document.getElementById('vmHours').value = 24;
        
        document.getElementById('aksSize').value = 'D2s_v3';
        document.getElementById('aksNodes').value = 3;
        
        document.getElementById('storageType').value = 'Standard_GRS';
        document.getElementById('storageSize').value = 256;
        document.getElementById('backupEnabled').checked = true;
        
        document.getElementById('dbType').value = 'sql_standard';
        document.getElementById('dbSize').value = 'S1';
        document.getElementById('dbBackup').checked = true;
        
        this.calculateCosts();
        this.showNotification('Configuration réinitialisée', 'info');
    }

    useFallbackCalculations() {
        // Calculs de secours si l'API échoue
        const config = this.getConfig();
        
        const vmCost = config.vm.count * config.vm.hours * 0.12 * 30;
        const aksCost = config.aks.nodes * 24 * 0.08 * 30;
        const storageCost = config.storage.size * 0.12;
        const dbCost = config.database.type === 'none' ? 0 : 
                      config.database.type === 'sql_basic' ? 5.99 :
                      config.database.type === 'sql_standard' ? 14.99 : 24.99;
        
        const total = vmCost + aksCost + storageCost + dbCost;
        const hidden = total * 0.15;
        
        this.currentCosts = {
            vm: vmCost,
            aks: aksCost,
            storage: storageCost,
            database: dbCost,
            hidden: hidden,
            total: total + hidden
        };
        
        this.updateCostDisplay(this.currentCosts);
        this.updateCharts(this.currentCosts);
        this.generateRecommendations(this.currentCosts);
    }

    switchChartTab(event) {
        const btn = event.target.closest('.tab-btn');
        if (!btn) return;
        
        // Active le bouton cliqué
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Met à jour le graphique de comparaison
        const chartType = btn.dataset.chart;
        if (this.charts.comparison && this.currentCosts && this.optimizedCosts) {
            if (chartType === 'annual') {
                this.charts.comparison.data.datasets[0].data = [
                    this.currentCosts.total * 12,
                    this.optimizedCosts.total * 12
                ];
                this.charts.comparison.options.scales.y.ticks.callback = (value) => `€${value}`;
            } else {
                this.charts.comparison.data.datasets[0].data = [
                    this.currentCosts.total,
                    this.optimizedCosts.total
                ];
                this.charts.comparison.options.scales.y.ticks.callback = (value) => `€${value}`;
            }
            this.charts.comparison.update();
        }
    }

    applyQuickAction(event) {
        const btn = event.target.closest('.btn-action');
        if (!btn) return;
        
        const action = btn.getAttribute('onclick')?.match(/'(\w+)'/)?.[1];
        if (action) {
            this.applyOptimization(action);
        }
    }

    applyOptimization(type) {
        switch (type) {
            case 'hours':
                document.getElementById('vmHours').value = 12;
                break;
            case 'storage':
                document.getElementById('storageType').value = 'Standard_LRS';
                break;
            case 'aks':
                document.getElementById('aksNodes').value = 2;
                break;
        }
        
        this.calculateCosts();
        this.showNotification('Optimisation appliquée !', 'success');
    }

    exportResults() {
        if (!this.currentCosts) {
            this.showNotification('Calculez d\'abord vos coûts', 'warning');
            return;
        }
        
        const data = {
            config: this.currentConfig,
            costs: this.currentCosts,
            optimized: this.optimizedCosts,
            date: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `azure-costs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Résultats exportés !', 'success');
    }

    showHelp() {
        const help = `
        <div class="help-modal">
            <h3><i class="fas fa-question-circle"></i> Aide du calculateur</h3>
            <div class="help-content">
                <h4>Comment utiliser :</h4>
                <p>1. Configurez vos ressources Azure dans la section "Configuration"</p>
                <p>2. Cliquez sur "Calculer les coûts" pour obtenir une estimation</p>
                <p>3. Consultez les recommandations d'optimisation</p>
                <p>4. Appliquez les optimisations suggérées</p>
                
                <h4>Fonctionnalités :</h4>
                <ul>
                    <li>📊 Graphiques interactifs</li>
                    <li>💡 Recommandations intelligentes</li>
                    <li>👁️ Coûts cachés Azure</li>
                    <li>🔄 Comparaison avant/après</li>
                    <li>💾 Export des résultats</li>
                </ul>
            </div>
        </div>
        `;
        
        this.showModal('Aide', help);
    }

    showContact() {
        const contact = `
        <div class="contact-modal">
            <h3><i class="fas fa-envelope"></i> Contact Pierre-DevOps</h3>
            <div class="contact-content">
                <p>Pour un audit personnalisé de vos coûts Azure :</p>
                <div class="contact-info">
                    <p><i class="fas fa-globe"></i> <strong>Site :</strong> https://pierre-devops.com</p>
                    <p><i class="fas fa-envelope"></i> <strong>Email :</strong> contact@pierre-devops.com</p>
                    <p><i class="fas fa-calendar"></i> <strong>Réponse sous 24h</strong></p>
                </div>
                <p class="contact-note">Spécialiste en optimisation cloud et DevOps sur Azure</p>
            </div>
        </div>
        `;
        
        this.showModal('Contact', contact);
    }

    showModal(title, content) {
        // Crée une modale simple
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Fermeture
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fade-in`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
            color: white;
            border-radius: var(--radius-md);
            z-index: 9999;
            box-shadow: var(--shadow-lg);
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 300px;
            max-width: 400px;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showLoading() {
        const calculateBtn = document.getElementById('calculateBtn');
        if (calculateBtn) {
            calculateBtn.innerHTML = '<div class="spinner"></div> Calcul en cours...';
            calculateBtn.disabled = true;
        }
    }

    hideLoading() {
        const calculateBtn = document.getElementById('calculateBtn');
        if (calculateBtn) {
            calculateBtn.innerHTML = '<i class="fas fa-calculator"></i> Calculer les coûts';
            calculateBtn.disabled = false;
        }
    }
}

// Initialisation quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new AzureCostCalculator();
    window.calculator.init();
    
    // Définir applyOptimization globalement
    window.applyOptimization = (type) => window.calculator.applyOptimization(type);
});

// Styles CSS pour les notifications et modales
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
    }
    
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
    }
    
    .modal-content {
        background: white;
        border-radius: var(--radius-lg);
        padding: 32px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: var(--shadow-xl);
    }
    
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 2px solid var(--gray-100);
    }
    
    .modal-header h3 {
        color: var(--primary);
        font-size: 1.5rem;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .modal-close {
        background: none;
        border: none;
        font-size: 2rem;
        color: var(--gray-600);
        cursor: pointer;
        line-height: 1;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .modal-close:hover {
        color: var(--danger);
    }
    
    .recommendation-item {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 20px;
        background: var(--gray-50);
        border-radius: var(--radius-md);
        margin-bottom: 16px;
        border-left: 4px solid var(--primary);
    }
    
    .recommendation-icon {
        width: 48px;
        height: 48px;
        border-radius: var(--radius-md);
        background: var(--primary);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
    }
    
    .recommendation-content {
        flex: 1;
    }
    
    .recommendation-content h5 {
        color: var(--gray-900);
        margin-bottom: 8px;
        font-size: 1.1rem;
    }
    
    .recommendation-content p {
        color: var(--gray-600);
        font-size: 0.95rem;
        line-height: 1.5;
    }
    
    .help-content, .contact-content {
        line-height: 1.8;
    }
    
    .help-content h4, .contact-content h4 {
        color: var(--primary);
        margin: 20px 0 10px 0;
        font-size: 1.1rem;
    }
    
    .help-content ul {
        padding-left: 20px;
        margin: 10px 0;
    }
    
    .help-content li {
        margin-bottom: 8px;
    }
    
    .contact-info {
        background: var(--gray-50);
        padding: 20px;
        border-radius: var(--radius-md);
        margin: 20px 0;
    }
    
    .contact-info p {
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .contact-note {
        font-style: italic;
        color: var(--gray-600);
        text-align: center;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid var(--gray-200);
    }
`;
document.head.appendChild(style);

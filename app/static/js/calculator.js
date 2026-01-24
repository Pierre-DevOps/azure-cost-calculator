/**
 * Azure Cost Intelligence Engine
 * Un moteur d'analyse prédictive avec IA pour l'optimisation des coûts Azure
 */

class AzureCostIntelligence {
    constructor() {
        this.config = {
            vm: { type: 'D2s_v3', count: 2, hours: 16 },
            storage: { type: 'Standard_LRS', size: 512, backup: true },
            aks: { enabled: true, nodes: 3 },
            database: { enabled: true, tier: 'Standard_S0' }
        };
        
        this.pricing = {
            vm: {
                'B2s': { hour: 0.0416, month: 41.00 },
                'D2s_v3': { hour: 0.119, month: 119.00 },
                'D4s_v3': { hour: 0.238, month: 238.00 },
                'E4s_v3': { hour: 0.284, month: 284.00 }
            },
            storage: {
                'Standard_LRS': 0.018,
                'Standard_GRS': 0.036,
                'Premium_LRS': 0.154,
                'Premium_ZRS': 0.185
            },
            backup: 0.10,
            aks: 0.119,
            database: {
                'Basic': 5.99,
                'Standard_S0': 14.99,
                'Standard_S1': 29.99,
                'Premium_P1': 219.99
            },
            hidden: {
                bandwidth: 0.087,
                snapshot: 0.05,
                monitoring: 2.49,
                security: 0.033
            }
        };
        
        this.charts = {};
        this.animations = {};
        this.isAnalyzing = false;
        this.API_BASE = '/api';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initCharts();
        this.initializeUI();
        this.performAnalysis();
        this.startLiveUpdates();
        
        // Effet de chargement initial
        this.showLoader();
        setTimeout(() => {
            this.hideLoader();
            this.showNotification('Azure Cost Intelligence ready', 'success');
        }, 1500);
    }
    
    setupEventListeners() {
        // Sélectionneurs de type VM
        document.querySelectorAll('.vtype-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectVMType(e));
        });
        
        // Contrôles quantité
        document.getElementById('vmMinus').addEventListener('click', () => this.adjustVMCount(-1));
        document.getElementById('vmPlus').addEventListener('click', () => this.adjustVMCount(1));
        
        // Sliders
        document.getElementById('vmHours').addEventListener('input', (e) => this.updateTimeline(e));
        document.getElementById('storageSize').addEventListener('input', (e) => this.updateStorage(e));
        document.getElementById('aksNodes').addEventListener('input', (e) => this.updateAKS(e));
        
        // Toggles
        document.getElementById('aksEnabled').addEventListener('change', () => this.toggleService('aks'));
        document.getElementById('dbEnabled').addEventListener('change', () => this.toggleService('database'));
        document.getElementById('backupEnabled').addEventListener('change', () => this.toggleBackup());
        
        // Sélecteurs de tier
        document.querySelectorAll('.tier-option').forEach(option => {
            option.addEventListener('click', (e) => this.selectStorageTier(e));
        });
        
        // Presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyPreset(e));
        });
        
        // Boutons d'action
        document.getElementById('calculateBtn').addEventListener('click', () => this.performAnalysis());
        document.getElementById('quickOptimize').addEventListener('click', () => this.quickOptimize());
        
        // Toggles de comparaison
        document.getElementById('compareAnnual').addEventListener('change', () => this.toggleTimeframe());
        
        // Boutons d'application
        document.querySelectorAll('.apply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyRecommendation(e));
        });
        
        // Navigation
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('exportData').addEventListener('click', () => this.exportAnalysis());
        
        // Mise à jour en temps réel
        const inputs = ['vmHours', 'storageSize', 'aksNodes', 'dbTier'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.debouncedAnalysis());
        });
    }
    
    initializeUI() {
        // Initialise les valeurs d'affichage
        this.updateVMDisplay();
        this.updateStorageDisplay();
        this.updateAKSDisplay();
        
        // Met à jour les badges de coût
        this.updateCostBadges();
        
        // Initialise les animations
        this.initAnimations();
    }
    
    initAnimations() {
        // Animation du timeline
        this.animations.timeline = {
            element: document.getElementById('timelineFill'),
            value: 66.66
        };
        
        // Animation de la capacité
        this.animations.capacity = {
            element: document.getElementById('capacityFill'),
            value: 25
        };
        
        // Effet de particules pour le bouton principal
        const btn = document.getElementById('calculateBtn');
        btn.addEventListener('mouseenter', () => this.createParticles(btn));
    }
    
    createParticles(element) {
        const rect = element.getBoundingClientRect();
        const particles = 15;
        
        for (let i = 0; i < particles; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 4px;
                height: 4px;
                background: var(--primary);
                border-radius: 50%;
                pointer-events: none;
                z-index: 10000;
                left: ${rect.left + rect.width/2}px;
                top: ${rect.top + rect.height/2}px;
            `;
            
            document.body.appendChild(particle);
            
            // Animation aléatoire
            const angle = Math.random() * Math.PI * 2;
            const velocity = 2 + Math.random() * 3;
            const distance = 20 + Math.random() * 30;
            
            const animate = () => {
                const x = Math.cos(angle) * velocity;
                const y = Math.sin(angle) * velocity;
                
                particle.style.transform = `translate(${x}px, ${y}px)`;
                particle.style.opacity = 1 - (distance / 50);
                
                if (distance > 0) {
                    requestAnimationFrame(animate);
                } else {
                    particle.remove();
                }
            };
            
            animate();
        }
    }
    
    selectVMType(event) {
        const option = event.currentTarget;
        const type = option.dataset.type;
        
        // Désactive toutes les options
        document.querySelectorAll('.vtype-option').forEach(opt => {
            opt.dataset.active = 'false';
        });
        
        // Active l'option sélectionnée
        option.dataset.active = 'true';
        
        // Met à jour la configuration
        this.config.vm.type = type;
        
        // Animation de sélection
        this.animateSelection(option);
        
        // Analyse
        this.debouncedAnalysis();
    }
    
    selectStorageTier(event) {
        const option = event.currentTarget;
        const tier = option.dataset.tier;
        
        // Désactive toutes les options
        document.querySelectorAll('.tier-option').forEach(opt => {
            opt.dataset.active = 'false';
        });
        
        // Active l'option sélectionnée
        option.dataset.active = 'true';
        
        // Met à jour la configuration
        this.config.storage.type = tier;
        
        // Animation
        this.animateSelection(option);
        
        // Analyse
        this.debouncedAnalysis();
    }
    
    animateSelection(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 150);
        
        // Effet de ripple
        const ripple = document.createElement('div');
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(0, 188, 242, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${rect.left}px`;
        ripple.style.top = `${rect.top}px`;
        
        document.body.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    }
    
    adjustVMCount(delta) {
        let count = parseInt(document.getElementById('vmQty').textContent) || 2;
        count = Math.max(1, Math.min(20, count + delta));
        
        // Animation du compteur
        this.animateCounter('vmQty', count);
        
        // Met à jour la configuration
        this.config.vm.count = count;
        
        // Analyse
        this.debouncedAnalysis();
    }
    
    animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        const current = parseInt(element.textContent) || 0;
        const duration = 300;
        const steps = 20;
        const stepValue = (targetValue - current) / steps;
        
        let step = 0;
        const animate = () => {
            if (step < steps) {
                const value = Math.round(current + (stepValue * step));
                element.textContent = value;
                step++;
                setTimeout(animate, duration / steps);
            } else {
                element.textContent = targetValue;
            }
        };
        
        animate();
    }
    
    updateTimeline(event) {
        const hours = parseInt(event.target.value);
        const percentage = ((hours - 4) / 20) * 100;
        
        // Animation de la timeline
        this.animateValue(this.animations.timeline, percentage);
        
        // Met à jour l'affichage
        document.getElementById('timelineFill').style.width = `${percentage}%`;
        
        // Met à jour la configuration
        this.config.vm.hours = hours;
        
        // Analyse
        this.debouncedAnalysis();
    }
    
    updateStorage(event) {
        const size = parseInt(event.target.value);
        const percentage = (size / 2048) * 100;
        
        // Animation de la capacité
        this.animateValue(this.animations.capacity, percentage);
        
        // Met à jour l'affichage
        document.getElementById('storageValue').textContent = `${size} GB`;
        document.getElementById('capacityFill').style.width = `${percentage}%`;
        
        // Met à jour la configuration
        this.config.storage.size = size;
        
        // Analyse
        this.debouncedAnalysis();
    }
    
    updateAKS(event) {
        const nodes = parseInt(event.target.value);
        document.getElementById('aksNodesValue').textContent = nodes;
        this.config.aks.nodes = nodes;
        this.debouncedAnalysis();
    }
    
    toggleService(service) {
        const enabled = document.getElementById(`${service}Enabled`).checked;
        const configEl = document.getElementById(`${service}Config`);
        
        // Animation de transition
        if (enabled) {
            configEl.style.display = 'block';
            configEl.style.opacity = '0';
            configEl.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                configEl.style.transition = 'all 0.3s ease';
                configEl.style.opacity = '1';
                configEl.style.transform = 'translateY(0)';
            }, 10);
        } else {
            configEl.style.transition = 'all 0.3s ease';
            configEl.style.opacity = '0';
            configEl.style.transform = 'translateY(-10px)';
            
            setTimeout(() => {
                configEl.style.display = 'none';
            }, 300);
        }
        
        // Met à jour la configuration
        this.config[service].enabled = enabled;
        
        // Analyse
        this.debouncedAnalysis();
    }
    
    toggleBackup() {
        const enabled = document.getElementById('backupEnabled').checked;
        this.config.storage.backup = enabled;
        this.debouncedAnalysis();
    }
    
    applyPreset(event) {
        const btn = event.currentTarget;
        const size = parseInt(btn.dataset.size);
        
        // Animation du bouton
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => {
            btn.style.transform = 'scale(1)';
        }, 150);
        
        // Applique le preset
        document.getElementById('storageSize').value = size;
        this.updateStorage({ target: { value: size } });
    }
    
    toggleTimeframe() {
        const isAnnual = document.getElementById('compareAnnual').checked;
        this.updateComparisonChart(isAnnual);
    }
    
    animateValue(animation, target) {
        const start = animation.value;
        const duration = 500;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = start + (target - start) * ease;
            
            animation.value = current;
            animation.element.style.width = `${current}%`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    async performAnalysis() {
        if (this.isAnalyzing) return;
        
        this.isAnalyzing = true;
        this.showLoader();
        
        try {
            // Calcul des coûts
            const costs = this.calculateCosts();
            
            // Analyse d'optimisation IA
            const recommendations = this.analyzeOptimizations(costs);
            
            // Calcul de la configuration optimisée
            const optimized = this.calculateOptimizedConfig();
            
            // Mise à jour de l'interface
            this.updateCostDisplay(costs);
            this.updateCharts(costs, optimized);
            this.updateRecommendations(recommendations);
            this.updateOptimizationSummary(costs, optimized);
            this.updateHiddenCosts(costs);
            this.updateComparison(costs, optimized);
            
            // Animation de succès
            this.animateSuccess();
            
        } catch (error) {
            console.error('Analysis error:', error);
            this.showNotification('Analysis failed', 'error');
        } finally {
            this.isAnalyzing = false;
            this.hideLoader();
        }
    }
    
    calculateCosts() {
        const { vm, storage, aks, database } = this.config;
        
        // Coûts VM
        const vmPrice = this.pricing.vm[vm.type]?.month || 119;
        const vmCost = vmPrice * vm.count * (vm.hours / 24);
        
        // Coûts stockage
        const storageRate = this.pricing.storage[storage.type] || 0.018;
        let storageCost = storageRate * storage.size;
        if (storage.backup) storageCost += storage.size * this.pricing.backup;
        
        // Coûts AKS
        let aksCost = 0;
        if (aks.enabled) {
            aksCost = this.pricing.aks * aks.nodes * 730; // Heures par mois
        }
        
        // Coûts base de données
        let dbCost = 0;
        if (database.enabled) {
            dbCost = this.pricing.database[database.tier] || 14.99;
        }
        
        // Coûts cachés
        const hiddenCosts = this.calculateHiddenCosts(vm, storage, aks);
        
        // Total
        const total = vmCost + storageCost + aksCost + dbCost + hiddenCosts.total;
        
        return {
            vm: Math.round(vmCost),
            storage: Math.round(storageCost),
            aks: Math.round(aksCost),
            database: Math.round(dbCost),
            hidden: hiddenCosts,
            total: Math.round(total)
        };
    }
    
    calculateHiddenCosts(vm, storage, aks) {
        const bandwidth = storage.size * 0.1 * this.pricing.hidden.bandwidth;
        const snapshots = storage.size * 0.2 * this.pricing.hidden.snapshot;
        const monitoring = (vm.count + (aks.enabled ? aks.nodes : 0)) * this.pricing.hidden.monitoring;
        const security = vm.count * 3 * this.pricing.hidden.security;
        
        const total = bandwidth + snapshots + monitoring + security;
        
        return {
            bandwidth: Math.round(bandwidth),
            snapshots: Math.round(snapshots),
            monitoring: Math.round(monitoring),
            security: Math.round(security),
            total: Math.round(total)
        };
    }
    
    analyzeOptimizations(costs) {
        const recommendations = [];
        
        // Analyse des VMs
        if (this.config.vm.hours > 12) {
            recommendations.push({
                id: 'auto-scale',
                title: 'Auto-scaling Schedule',
                description: 'Scale down non-production VMs during off-hours',
                impact: 'high',
                savings: Math.round(costs.vm * 0.3),
                difficulty: 'easy',
                action: () => {
                    this.config.vm.hours = 12;
                    document.getElementById('vmHours').value = 12;
                    this.updateTimeline({ target: { value: 12 } });
                }
            });
        }
        
        // Analyse du stockage
        if (this.config.storage.type === 'Premium_LRS' && !this.config.database.enabled) {
            recommendations.push({
                id: 'storage-tier',
                title: 'Storage Tier Optimization',
                description: 'Move cold data to archive tier',
                impact: 'medium',
                savings: Math.round(costs.storage * 0.2),
                difficulty: 'medium',
                action: () => {
                    this.selectStorageTierUI('Standard_LRS');
                }
            });
        }
        
        // Analyse AKS
        if (this.config.aks.enabled && this.config.aks.nodes > 2) {
            recommendations.push({
                id: 'aks-scale',
                title: 'AKS Node Optimization',
                description: 'Right-size your Kubernetes cluster',
                impact: 'medium',
                savings: Math.round(costs.aks * 0.25),
                difficulty: 'easy',
                action: () => {
                    this.config.aks.nodes = 2;
                    document.getElementById('aksNodes').value = 2;
                    this.updateAKS({ target: { value: 2 } });
                }
            });
        }
        
        // Recommandations génériques
        if (costs.total > 1000) {
            recommendations.push({
                id: 'reserved-instances',
                title: 'Reserved Instances',
                description: 'Commit to 1-year reserved VMs',
                impact: 'low',
                savings: Math.round(costs.vm * 0.15),
                difficulty: 'commitment',
                action: () => {
                    this.showNotification('Reserved instances configured', 'info');
                }
            });
        }
        
        return recommendations;
    }
    
    selectStorageTierUI(tier) {
        document.querySelectorAll('.tier-option').forEach(opt => {
            opt.dataset.active = (opt.dataset.tier === tier).toString();
        });
        this.config.storage.type = tier;
        this.debouncedAnalysis();
    }
    
    calculateOptimizedConfig() {
        const optimized = JSON.parse(JSON.stringify(this.config));
        
        // Optimisations automatiques
        if (optimized.vm.hours > 12) optimized.vm.hours = 12;
        if (optimized.aks.enabled && optimized.aks.nodes > 2) optimized.aks.nodes = 2;
        if (optimized.storage.type === 'Premium_LRS') optimized.storage.type = 'Standard_GRS';
        if (optimized.storage.size > 500) optimized.storage.size = Math.max(100, Math.floor(optimized.storage.size * 0.7));
        
        // Calcul des coûts optimisés
        const tempConfig = this.config;
        this.config = optimized;
        const costs = this.calculateCosts();
        this.config = tempConfig;
        
        return costs;
    }
    
    updateCostDisplay(costs) {
        const formatter = new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        
        // Coût total
        document.getElementById('totalCostDisplay').textContent = formatter.format(costs.total);
        
        // Coûts par catégorie
        document.getElementById('computeCost').textContent = formatter.format(costs.vm);
        document.getElementById('storageCost').textContent = formatter.format(costs.storage);
        document.getElementById('servicesCost').textContent = formatter.format(costs.aks + costs.database);
        
        // Mise à jour des badges
        this.updateCostBadges(costs);
    }
    
    updateCostBadges(costs) {
        if (!costs) costs = this.calculateCosts();
        
        document.getElementById('vmCostBadge').textContent = `€${costs.vm}/mois`;
        document.getElementById('storageCostBadge').textContent = `€${costs.storage}/mois`;
        document.getElementById('servicesCostBadge').textContent = `€${costs.aks + costs.database}/mois`;
    }
    
    initCharts() {
        // Chart de répartition des coûts
        const ctx1 = document.getElementById('costDistributionChart')?.getContext('2d');
        if (ctx1) {
            this.charts.distribution = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: ['Compute', 'Storage', 'AKS', 'Database', 'Hidden'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: [
                            'rgba(0, 188, 242, 0.8)',
                            'rgba(155, 77, 255, 0.8)',
                            'rgba(255, 77, 141, 0.8)',
                            'rgba(0, 214, 143, 0.8)',
                            'rgba(255, 170, 0, 0.8)'
                        ],
                        borderWidth: 0,
                        hoverOffset: 20
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return `${label}: €${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Chart de comparaison
        const ctx2 = document.getElementById('comparisonChart')?.getContext('2d');
        if (ctx2) {
            this.charts.comparison = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: ['Current', 'Optimized'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: [
                            'rgba(0, 188, 242, 0.8)',
                            'rgba(0, 214, 143, 0.8)'
                        ],
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
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { 
                                color: 'rgba(255, 255, 255, 0.6)',
                                callback: (value) => `€${value}`
                            }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: 'rgba(255, 255, 255, 0.6)' }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `€${context.parsed.y}`
                            }
                        }
                    }
                }
            });
        }
    }
    
    updateCharts(costs, optimized) {
        // Chart de répartition
        if (this.charts.distribution) {
            this.charts.distribution.data.datasets[0].data = [
                costs.vm,
                costs.storage,
                costs.aks,
                costs.database,
                costs.hidden.total
            ];
            this.charts.distribution.update();
        }
        
        // Chart de comparaison
        if (this.charts.comparison && optimized) {
            this.charts.comparison.data.datasets[0].data = [
                costs.total,
                optimized.total
            ];
            this.charts.comparison.update();
        }
    }
    
    updateComparisonChart(isAnnual) {
        const costs = this.calculateCosts();
        const optimized = this.calculateOptimizedConfig();
        
        if (this.charts.comparison) {
            const multiplier = isAnnual ? 12 : 1;
            this.charts.comparison.data.datasets[0].data = [
                costs.total * multiplier,
                optimized.total * multiplier
            ];
            this.charts.comparison.update();
        }
    }
    
    updateRecommendations(recommendations) {
        const container = document.querySelector('.optimization-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        recommendations.forEach(rec => {
            const item = document.createElement('div');
            item.className = `optimization-item ${rec.impact}-impact`;
            item.innerHTML = `
                <div class="optimization-icon">
                    <i class="fas fa-${this.getRecommendationIcon(rec.id)}"></i>
                </div>
                <div class="optimization-content">
                    <h4>${rec.title}</h4>
                    <p>${rec.description}</p>
                    <div class="optimization-impact">
                        <span class="impact-value">Save €${rec.savings}/mois</span>
                        <span class="impact-difficulty">${rec.difficulty}</span>
                    </div>
                </div>
                <button class="apply-btn" data-id="${rec.id}">
                    <i class="fas fa-check"></i>
                </button>
            `;
            
            container.appendChild(item);
            
            // Ajout de l'événement
            item.querySelector('.apply-btn').addEventListener('click', () => {
                rec.action();
                this.performAnalysis();
            });
        });
    }
    
    getRecommendationIcon(id) {
        const icons = {
            'auto-scale': 'clock',
            'storage-tier': 'database',
            'aks-scale': 'server',
            'reserved-instances': 'calendar-check'
        };
        return icons[id] || 'lightbulb';
    }
    
    updateOptimizationSummary(costs, optimized) {
        if (!optimized) return;
        
        const savings = costs.total - optimized.total;
        const percentage = Math.round((savings / costs.total) * 100);
        const score = Math.min(100, Math.round(60 + (percentage * 1.5)));
        
        document.getElementById('potentialSavings').textContent = `€${savings}/mois`;
        document.getElementById('optimizationScore').textContent = `${score}/100`;
    }
    
    updateHiddenCosts(costs) {
        document.getElementById('bandwidthCost').textContent = `€${costs.hidden.bandwidth}`;
        document.getElementById('snapshotsCost').textContent = `€${costs.hidden.snapshots}`;
        document.getElementById('monitoringCost').textContent = `€${costs.hidden.monitoring}`;
        document.getElementById('securityCost').textContent = `€${costs.hidden.security}`;
        document.getElementById('totalHiddenCost').textContent = `€${costs.hidden.total}/mois`;
    }
    
    updateComparison(costs, optimized) {
        if (!optimized) return;
        
        const savings = costs.total - optimized.total;
        const percentage = Math.round((savings / costs.total) * 100);
        
        document.getElementById('currentCost').textContent = `€${costs.total}`;
        document.getElementById('optimizedCost').textContent = `€${optimized.total}`;
        document.getElementById('savingsAmount').textContent = `€${savings}`;
        document.getElementById('savingsPercent').textContent = `${percentage}%`;
    }
    
    quickOptimize() {
        this.showLoader();
        
        // Applique les optimisations automatiques
        if (this.config.vm.hours > 12) {
            this.config.vm.hours = 12;
            document.getElementById('vmHours').value = 12;
            this.updateTimeline({ target: { value: 12 } });
        }
        
        if (this.config.aks.enabled && this.config.aks.nodes > 2) {
            this.config.aks.nodes = 2;
            document.getElementById('aksNodes').value = 2;
            this.updateAKS({ target: { value: 2 } });
        }
        
        if (this.config.storage.type === 'Premium_LRS') {
            this.selectStorageTierUI('Standard_GRS');
        }
        
        // Recalcule
        setTimeout(() => {
            this.performAnalysis();
            this.showNotification('Quick optimization applied', 'success');
        }, 500);
    }
    
    applyRecommendation(event) {
        const btn = event.currentTarget;
        const id = btn.dataset.id;
        
        // Animation du bouton
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
        
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-check"></i>';
            btn.disabled = false;
            
            // Trouve et applique la recommandation
            // (La logique d'application est gérée dans les écouteurs d'événements)
            
            this.showNotification('Recommendation applied', 'success');
        }, 1000);
    }
    
    toggleTheme() {
        const btn = document.getElementById('themeToggle');
        const icon = btn.querySelector('i');
        
        // Animation du bouton
        btn.style.transform = 'rotate(180deg)';
        setTimeout(() => {
            btn.style.transform = 'rotate(0)';
        }, 300);
        
        // Change l'icône
        if (icon.classList.contains('fa-moon')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            document.body.style.filter = 'invert(1) hue-rotate(180deg)';
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            document.body.style.filter = 'none';
        }
    }
    
    exportAnalysis() {
        const costs = this.calculateCosts();
        const optimized = this.calculateOptimizedConfig();
        
        const data = {
            config: this.config,
            costs: costs,
            optimized: optimized,
            analysis: {
                timestamp: new Date().toISOString(),
                version: '2.0',
                savings: costs.total - optimized.total
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `azure-cost-analysis-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Analysis exported', 'success');
    }
    
    startLiveUpdates() {
        // Met à jour l'heure
        setInterval(() => {
            const time = new Date().toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit'
            });
            document.getElementById('updateTime').textContent = `Last updated: ${time}`;
        }, 60000);
        
        // Animation des statistiques
        setInterval(() => {
            this.animateStats();
        }, 5000);
    }
    
    animateStats() {
        const stats = ['avgSaving', 'analysedCosts', 'optimizedHours'];
        
        stats.forEach(id => {
            const element = document.getElementById(id);
            if (!element) return;
            
            const current = parseInt(element.textContent.replace(/[^0-9]/g, '')) || 0;
            const target = current + Math.floor(Math.random() * 10) - 5;
            
            this.animateCounterValue(element, current, Math.max(0, target));
        });
    }
    
    animateCounterValue(element, start, end) {
        const duration = 1000;
        const steps = 60;
        const stepValue = (end - start) / steps;
        const unit = element.textContent.replace(/[0-9]/g, '');
        
        let step = 0;
        const animate = () => {
            if (step < steps) {
                const value = Math.round(start + (stepValue * step));
                element.textContent = value + unit;
                step++;
                setTimeout(animate, duration / steps);
            } else {
                element.textContent = end + unit;
            }
        };
        
        animate();
    }
    
    animateSuccess() {
        // Effet de confetti
        this.createConfetti();
        
        // Animation des cartes
        document.querySelectorAll('.visual-card').forEach((card, index) => {
            card.style.transform = 'translateY(-20px)';
            card.style.opacity = '0';
            
            setTimeout(() => {
                card.style.transition = 'all 0.5s ease';
                card.style.transform = 'translateY(0)';
                card.style.opacity = '1';
            }, index * 100);
        });
    }
    
    createConfetti() {
        const colors = ['#00BCF2', '#9B4DFF', '#FF4D8D', '#00D68F', '#FFAA00'];
        const confettiCount = 50;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: fixed;
                width: 10px;
                height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                border-radius: 2px;
                pointer-events: none;
                z-index: 10000;
                left: ${Math.random() * 100}vw;
                top: -20px;
                transform: rotate(${Math.random() * 360}deg);
            `;
            
            document.body.appendChild(confetti);
            
            // Animation
            const duration = 1000 + Math.random() * 1000;
            const animation = confetti.animate([
                { transform: `translateY(0) rotate(0deg)`, opacity: 1 },
                { transform: `translateY(100vh) rotate(${Math.random() * 720}deg)`, opacity: 0 }
            ], {
                duration: duration,
                easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)'
            });
            
            animation.onfinish = () => confetti.remove();
        }
    }
    
    showLoader() {
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: var(--primary);
        `;
        
        loader.innerHTML = `
            <div class="spinner" style="
                width: 60px;
                height: 60px;
                border: 4px solid transparent;
                border-top: 4px solid var(--primary);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin-bottom: 20px;
            "></div>
            <div style="
                font-size: 1.2rem;
                font-weight: 600;
                background: linear-gradient(135deg, var(--primary), var(--secondary));
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            ">Analyzing Azure Costs...</div>
        `;
        
        document.body.appendChild(loader);
    }
    
    hideLoader() {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.3s ease';
            setTimeout(() => loader.remove(), 300);
        }
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? 'var(--success)' : 
                        type === 'error' ? 'var(--danger)' : 
                        type === 'warning' ? 'var(--warning)' : 'var(--info)'};
            color: white;
            border-radius: var(--radius-md);
            z-index: 10000;
            box-shadow: var(--glass-shadow);
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 300px;
            max-width: 400px;
            transform: translateX(100%);
            opacity: 0;
            transition: all 0.3s ease;
        `;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${icons[type]}" style="font-size: 1.2rem;"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Animation d'entrée
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);
        
        // Auto-dismiss
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    updateVMDisplay() {
        document.getElementById('vmQty').textContent = this.config.vm.count;
        document.getElementById('vmHours').value = this.config.vm.hours;
        document.getElementById('timelineFill').style.width = `${((this.config.vm.hours - 4) / 20) * 100}%`;
    }
    
    updateStorageDisplay() {
        document.getElementById('storageSize').value = this.config.storage.size;
        document.getElementById('storageValue').textContent = `${this.config.storage.size} GB`;
        document.getElementById('capacityFill').style.width = `${(this.config.storage.size / 2048) * 100}%`;
        document.getElementById('backupEnabled').checked = this.config.storage.backup;
    }
    
    updateAKSDisplay() {
        document.getElementById('aksEnabled').checked = this.config.aks.enabled;
        document.getElementById('aksNodes').value = this.config.aks.nodes;
        document.getElementById('aksNodesValue').textContent = this.config.aks.nodes;
    }
    
    // Debounce pour les analyses
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    debouncedAnalysis = this.debounce(() => this.performAnalysis(), 500);
}

// Initialisation quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.AzureAI = new AzureCostIntelligence();
    
    // Ajout des styles d'animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
        
        @keyframes confetti-fall {
            0% { transform: translateY(-100vh) rotate(0deg); }
            100% { transform: translateY(100vh) rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});

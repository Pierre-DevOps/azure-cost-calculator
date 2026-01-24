// Configuration des prix Azure (€/mois)
const PRICING = {
    vm: {
        'B2s': 0.0416,  // €/heure
        'D2s_v3': 0.119,
        'D4s_v3': 0.238,
        'E4s_v3': 0.284,
        'F4s_v2': 0.166
    },
    storage: {
        'hdd': 0.035,   // €/GB/mois
        'ssd': 0.102,
        'premium': 0.154,
        'ultra': 0.195
    },
    database: {
        'none': 0,
        'basic': 4.99,
        'standard': 14.99,
        'premium': 49.99,
        'cosmos': 24.0
    },
    backup: {
        'none': 0,
        'basic': 9.99,
        'advanced': 24.99
    },
    bandwidth: [
        { threshold: 5, rate: 0 },        // 0-5 GB: gratuit
        { threshold: 10, rate: 0.087 },   // 5-10 GB: 0.087€/GB
        { threshold: 50, rate: 0.083 },   // 10-50 GB: 0.083€/GB
        { threshold: 100, rate: 0.07 },   // 50-100 GB: 0.07€/GB
        { threshold: Infinity, rate: 0.05 } // 100+ GB: 0.05€/GB
    ],
    hidden: {
        snapshot: 0.05,      // €/GB/mois pour les snapshots
        monitoring: 2.49,    // €/instance/mois pour Log Analytics
        keyvault: 0.033,     // €/secret/mois
        loadbalancer: 18.26  // €/mois pour Load Balancer Standard
    }
};

// Variables globales pour les graphiques
let costDistributionChart = null;
let comparisonChart = null;
let originalCost = 0;
let optimizedCost = 0;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    calculateCosts(); // Calcul initial
});

function initializeEventListeners() {
    // Bouton de calcul
    document.getElementById('calculateBtn').addEventListener('click', calculateCosts);
    
    // Bouton d'optimisation
    document.getElementById('optimizeBtn').addEventListener('click', optimizeCosts);
    
    // Bouton de réinitialisation
    document.getElementById('resetBtn').addEventListener('click', resetToDefaults);
    
    // Écouteurs pour les changements d'entrée
    const inputs = ['vmCount', 'storageSize', 'bandwidth', 'hours'];
    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', calculateCosts);
    });
    
    const selects = ['vmType', 'storageTier', 'databaseTier', 'backup'];
    selects.forEach(id => {
        document.getElementById(id).addEventListener('change', calculateCosts);
    });
    
    // Slider des heures
    const hoursSlider = document.getElementById('hoursSlider');
    const hoursInput = document.getElementById('hours');
    hoursSlider.addEventListener('input', function() {
        hoursInput.value = this.value;
        calculateCosts();
    });
    hoursInput.addEventListener('input', function() {
        hoursSlider.value = this.value;
    });
    
    // Boutons d'application des optimisations
    document.querySelectorAll('.btn-apply').forEach(btn => {
        btn.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const optimizedValue = this.parentNode.querySelector('select, input').value;
            document.getElementById(targetId).value = optimizedValue;
            calculateCosts();
            showToast('Optimisation appliquée !', 'success');
        });
    });
}

// Fonction principale de calcul
async function calculateCosts() {
    // Récupération des valeurs
    const config = getCurrentConfig();
    
    // Calcul des coûts
    const costs = computeCosts(config);
    
    // Mise à jour de l'interface
    updateCostDisplay(costs);
    
    // Génération des graphiques
    updateCharts(costs);
    
    // Génération des recommandations
    generateRecommendations(config, costs);
    
    // Calcul des coûts cachés
    calculateHiddenCosts(config);
    
    // Sauvegarde du coût original pour comparaison
    if (originalCost === 0) {
        originalCost = costs.total;
    }
}

function getCurrentConfig() {
    return {
        vmCount: parseInt(document.getElementById('vmCount').value) || 4,
        vmType: document.getElementById('vmType').value,
        storageSize: parseInt(document.getElementById('storageSize').value) || 512,
        storageTier: document.getElementById('storageTier').value,
        databaseTier: document.getElementById('databaseTier').value,
        bandwidth: parseInt(document.getElementById('bandwidth').value) || 100,
        backup: document.getElementById('backup').value,
        hours: parseInt(document.getElementById('hours').value) || 720
    };
}

function computeCosts(config) {
    // Coût des VMs
    const vmHourlyRate = PRICING.vm[config.vmType] || 0.119;
    const vmCost = vmHourlyRate * config.vmCount * config.hours;
    
    // Coût du stockage
    const storageRate = PRICING.storage[config.storageTier] || 0.102;
    const storageCost = storageRate * config.storageSize;
    
    // Coût de la base de données
    const dbCost = PRICING.database[config.databaseTier] || 0;
    
    // Coût de la sauvegarde
    const backupCost = PRICING.backup[config.backup] || 0;
    
    // Coût de la bande passante
    let bandwidthCost = 0;
    let remainingBandwidth = config.bandwidth;
    for (const tier of PRICING.bandwidth) {
        const tierUsage = Math.min(remainingBandwidth, tier.threshold);
        bandwidthCost += tierUsage * tier.rate;
        remainingBandwidth -= tierUsage;
        if (remainingBandwidth <= 0) break;
    }
    
    // Calcul du total
    const total = vmCost + storageCost + dbCost + backupCost + bandwidthCost;
    
    return {
        vm: vmCost,
        storage: storageCost,
        database: dbCost,
        backup: backupCost,
        bandwidth: bandwidthCost,
        total: total
    };
}

function updateCostDisplay(costs) {
    // Formatage monétaire
    const formatter = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    // Mise à jour des affichages
    document.getElementById('totalCost').textContent = formatter.format(costs.total);
    document.getElementById('vmCost').textContent = `VM: ${formatter.format(costs.vm)}`;
    document.getElementById('storageCost').textContent = `Stockage: ${formatter.format(costs.storage)}`;
    document.getElementById('dbCost').textContent = `Base de données: ${formatter.format(costs.database)}`;
    
    // Calcul des économies potentielles
    const potentialSavings = calculatePotentialSavings(costs.total);
    document.getElementById('savings').textContent = formatter.format(potentialSavings);
    const savingsPercent = Math.round((potentialSavings / costs.total) * 100);
    document.getElementById('savingsPercent').textContent = `${savingsPercent}%`;
}

function calculatePotentialSavings(currentCost) {
    // Simule une optimisation moyenne de 15-30%
    const savingsPercentage = 0.15 + (Math.random() * 0.15);
    return currentCost * savingsPercentage;
}

function updateCharts(costs) {
    const ctx1 = document.getElementById('costDistributionChart').getContext('2d');
    const ctx2 = document.getElementById('comparisonChart').getContext('2d');
    
    // Destruction des anciens graphiques
    if (costDistributionChart) costDistributionChart.destroy();
    if (comparisonChart) comparisonChart.destroy();
    
    // Graphique de répartition des coûts
    costDistributionChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Machines Virtuelles', 'Stockage', 'Base de données', 'Sauvegarde', 'Bande passante'],
            datasets: [{
                data: [costs.vm, costs.storage, costs.database, costs.backup, costs.bandwidth],
                backgroundColor: [
                    '#0078d4',
                    '#00b294',
                    '#ffb900',
                    '#e81123',
                    '#744da9'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${context.label}: €${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Graphique de comparaison avant/après
    const optimized = costs.total * 0.85; // Simule une optimisation de 15%
    optimizedCost = optimized;
    
    comparisonChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: ['Configuration Actuelle', 'Configuration Optimisée'],
            datasets: [{
                label: 'Coût Mensuel (€)',
                data: [costs.total, optimized],
                backgroundColor: ['#0078d4', '#00b294'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Coût (€)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Coût: €${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}

function generateRecommendations(config, costs) {
    const recommendations = [];
    const savings = calculatePotentialSavings(costs.total);
    
    // Analyse des VMs
    if (config.vmCount > 10) {
        recommendations.push({
            icon: 'warning',
            text: `Réduire le nombre de VMs de ${config.vmCount} à ${Math.ceil(config.vmCount * 0.8)} pourrait économiser €${(costs.vm * 0.2).toFixed(2)}/mois`,
            type: 'vm'
        });
    }
    
    if (config.vmType.includes('E4s_v3') || config.vmType.includes('F4s_v2')) {
        recommendations.push({
            icon: 'warning',
            text: 'Passer à des VMs de série D pourrait réduire les coûts de 20-30% sans impact performance',
            type: 'vm'
        });
    }
    
    // Analyse du stockage
    if (config.storageTier === 'premium' && !config.databaseTier.includes('premium')) {
        recommendations.push({
            icon: 'warning',
            text: 'Le stockage Premium n\'est pas nécessaire pour cette charge de travail. Passer en Standard SSD économiserait €' + (costs.storage * 0.3).toFixed(2) + '/mois',
            type: 'storage'
        });
    }
    
    // Analyse des heures
    if (config.hours > 720) {
        recommendations.push({
            icon: 'warning',
            text: 'Configuration de 744h détectée (fonctionnement 24/7). Évaluer l\'arrêt automatique hors heures de bureau pour économiser jusqu\'à 65%',
            type: 'hours'
        });
    } else if (config.hours < 168) {
        recommendations.push({
            icon: 'check-circle',
            text: 'Configuration temps partiel optimale détectée - Bonne gestion des coûts',
            type: 'hours'
        });
    }
    
    // Analyse de la base de données
    if (config.databaseTier === 'premium' && config.vmCount < 5) {
        recommendations.push({
            icon: 'warning',
            text: 'La base de données Premium est surdimensionnée pour cette infrastructure. Passer en Standard économiserait €' + (costs.database * 0.5).toFixed(2) + '/mois',
            type: 'database'
        });
    }
    
    // Génération de l'affichage
    const recommendationsContainer = document.getElementById('recommendations');
    recommendationsContainer.innerHTML = '';
    
    if (recommendations.length === 0) {
        recommendationsContainer.innerHTML = `
            <div class="recommendation-item">
                <i class="fas fa-check-circle success"></i>
                <span class="recommendation-text">Configuration optimale détectée ! Aucune optimisation majeure nécessaire.</span>
            </div>
        `;
    } else {
        recommendations.forEach(rec => {
            const div = document.createElement('div');
            div.className = 'recommendation-item';
            div.innerHTML = `
                <i class="fas fa-${rec.icon} ${rec.icon === 'check-circle' ? 'success' : 'warning'}"></i>
                <span class="recommendation-text">${rec.text}</span>
            `;
            recommendationsContainer.appendChild(div);
        });
    }
    
    // Mise à jour des suggestions d'optimisation
    updateOptimizationSuggestions(config, costs);
}

function updateOptimizationSuggestions(config, costs) {
    // Suggestions de VM optimisées
    const vmSelect = document.getElementById('optimizedVmType');
    vmSelect.innerHTML = '';
    
    const vmOptions = [
        { value: 'B2s', label: 'B2s (Économique)' },
        { value: 'D2s_v3', label: 'D2s v3 (Recommandé)' },
        { value: 'D4s_v3', label: 'D4s v3 (Performance)' }
    ];
    
    vmOptions.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.value === 'D2s_v3') option.selected = true;
        vmSelect.appendChild(option);
    });
    
    // Suggestions de stockage optimisé
    const storageSelect = document.getElementById('optimizedStorage');
    const optimalStorage = config.storageTier === 'premium' && config.databaseTier !== 'premium' ? 'ssd' : config.storageTier;
    storageSelect.value = optimalStorage;
    
    // Suggestions d'heures optimisées
    const hoursInput = document.getElementById('optimizedHours');
    const optimalHours = config.hours > 720 ? 720 : config.hours;
    hoursInput.value = optimalHours;
}

function calculateHiddenCosts(config) {
    const formatter = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    // Coût des snapshots (estimation: 10% du stockage)
    const snapshotCost = config.storageSize * 0.1 * PRICING.hidden.snapshot;
    document.getElementById('hiddenSnapshots').textContent = 
        `${formatter.format(snapshotCost)}/mois (0.05€/GB/mois)`;
    
    // Coût de monitoring
    const monitoringCost = config.vmCount * PRICING.hidden.monitoring;
    document.getElementById('hiddenMonitoring').textContent = 
        `${formatter.format(monitoringCost)}/mois (Log Analytics + Alertes)`;
    
    // Coût de sécurité
    const securityCost = config.vmCount * 3 * PRICING.hidden.keyvault;
    document.getElementById('hiddenSecurity').textContent = 
        `${formatter.format(securityCost)}/mois`;
    
    // Coût total caché
    const totalHidden = snapshotCost + monitoringCost + securityCost;
    document.getElementById('hiddenCost').textContent = formatter.format(totalHidden);
    
    // Bande passante déjà calculée
    const bandwidthConfig = getCurrentConfig();
    const bandwidthCost = computeCosts(bandwidthConfig).bandwidth;
    document.getElementById('hiddenBandwidth').textContent = 
        `${formatter.format(bandwidthCost)}/mois au-delà des 5GB gratuits`;
}

function optimizeCosts() {
    // Applique les optimisations automatiques
    const config = getCurrentConfig();
    
    // Optimisation automatique
    if (config.vmType.includes('E4s_v3') || config.vmType.includes('F4s_v2')) {
        document.getElementById('vmType').value = 'D2s_v3';
    }
    
    if (config.storageTier === 'premium' && config.databaseTier !== 'premium') {
        document.getElementById('storageTier').value = 'ssd';
    }
    
    if (config.hours > 720) {
        document.getElementById('hours').value = 720;
        document.getElementById('hoursSlider').value = 720;
    }
    
    if (config.databaseTier === 'premium' && config.vmCount < 5) {
        document.getElementById('databaseTier').value = 'standard';
    }
    
    // Recalcul
    calculateCosts();
    showToast('Optimisation automatique appliquée !', 'success');
}

function resetToDefaults() {
    document.getElementById('vmCount').value = 4;
    document.getElementById('vmType').value = 'D2s_v3';
    document.getElementById('storageSize').value = 512;
    document.getElementById('storageTier').value = 'ssd';
    document.getElementById('databaseTier').value = 'standard';
    document.getElementById('bandwidth').value = 100;
    document.getElementById('backup').value = 'basic';
    document.getElementById('hours').value = 720;
    document.getElementById('hoursSlider').value = 720;
    
    calculateCosts();
    showToast('Configuration réinitialisée aux valeurs par défaut', 'info');
}

function showToast(message, type = 'info') {
    // Crée un toast temporaire
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#0078d4'};
        color: white;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Ajoute les styles d'animation pour les toasts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

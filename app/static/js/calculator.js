// Configuration des prix Azure (€/mois)
const PRICING = {
    vm: {
        'B2s': 0.0416,    // €/heure
        'D2s_v3': 0.119,
        'D4s_v3': 0.238,
        'E4s_v3': 0.284,
        'F4s_v2': 0.166
    },
    aks: {
        'B2s': 0.0416,
        'D2s_v3': 0.119,
        'D4s_v3': 0.238
    },
    storage: {
        'standard_lrs': 0.018,    // €/GB/mois
        'standard_grs': 0.036,
        'premium_lrs': 0.154,
        'premium_zrs': 0.185
    },
    sql: {
        'basic': 4.99,
        'standard_s0': 14.99,
        'standard_s1': 29.99,
        'standard_s2': 59.99,
        'premium_p1': 219.99,
        'premium_p2': 439.99
    },
    hidden: {
        bandwidth: 0.087,          // €/GB (au-delà de 5GB gratuits)
        snapshot: 0.05,            // €/GB/mois
        loadbalancer: 18.26,       // €/mois
        monitoring: 2.49,          // €/instance/mois
        backup: 0.10               // €/GB/mois pour Azure Backup
    }
};

let costChart = null;
let currentConfig = {};
let optimizedConfig = {};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initSliders();
    initEventListeners();
    calculateAllCosts();
});

function initSliders() {
    // VM Hours Slider
    const vmSlider = document.getElementById('vmHoursSlider');
    const vmValue = document.getElementById('vmHoursValue');
    vmSlider.addEventListener('input', function() {
        vmValue.textContent = this.value;
        calculateVMCost();
    });

    // AKS Hours Slider
    const aksSlider = document.getElementById('aksHoursSlider');
    const aksValue = document.getElementById('aksHoursValue');
    aksSlider.addEventListener('input', function() {
        aksValue.textContent = this.value;
        calculateAKSCost();
    });

    // Storage Slider
    const storageSlider = document.getElementById('storageSlider');
    const storageValue = document.getElementById('storageValue');
    storageSlider.addEventListener('input', function() {
        storageValue.textContent = this.value;
        calculateStorageCost();
    });
}

function initEventListeners() {
    // Calcul bouton principal
    document.getElementById('calculateAllBtn').addEventListener('click', calculateAllCosts);
    
    // Bouton d'application des optimisations
    document.getElementById('applyOptimizationBtn').addEventListener('click', applyOptimizations);
    
    // Changements de sélection
    document.getElementById('vmSize').addEventListener('change', calculateVMCost);
    document.getElementById('vmQuantity').addEventListener('input', calculateVMCost);
    
    document.getElementById('aksSize').addEventListener('change', calculateAKSCost);
    document.getElementById('aksNodes').addEventListener('input', calculateAKSCost);
    
    document.getElementById('storageType').addEventListener('change', calculateStorageCost);
    document.getElementById('sqlTier').addEventListener('change', calculateSQLCost);
}

// Fonctions de calcul individuelles
function calculateVMCost() {
    const size = document.getElementById('vmSize').value;
    const quantity = parseInt(document.getElementById('vmQuantity').value) || 1;
    const hours = parseInt(document.getElementById('vmHoursSlider').value) || 24;
    
    const hourlyRate = PRICING.vm[size] || 0.0416;
    const dailyCost = hourlyRate * quantity * hours;
    const monthlyCost = dailyCost * 30;
    
    document.getElementById('vmCostPreview').textContent = `€${monthlyCost.toFixed(2)}/mois`;
    
    return {
        size, quantity, hours,
        monthly: monthlyCost,
        daily: dailyCost
    };
}

function calculateAKSCost() {
    const size = document.getElementById('aksSize').value;
    const nodes = parseInt(document.getElementById('aksNodes').value) || 2;
    const hours = parseInt(document.getElementById('aksHoursSlider').value) || 24;
    
    const hourlyRate = PRICING.aks[size] || 0.0416;
    const dailyCost = hourlyRate * nodes * hours;
    const monthlyCost = dailyCost * 30;
    
    document.getElementById('aksCostPreview').textContent = `€${monthlyCost.toFixed(2)}/mois`;
    
    return {
        size, nodes, hours,
        monthly: monthlyCost,
        daily: dailyCost
    };
}

function calculateStorageCost() {
    const type = document.getElementById('storageType').value;
    const capacity = parseInt(document.getElementById('storageSlider').value) || 100;
    
    const monthlyRate = PRICING.storage[type] || 0.018;
    const monthlyCost = monthlyRate * capacity;
    
    document.getElementById('storageCostPreview').textContent = `€${monthlyCost.toFixed(2)}/mois`;
    
    return {
        type, capacity,
        monthly: monthlyCost
    };
}

function calculateSQLCost() {
    const tier = document.getElementById('sqlTier').value;
    const monthlyCost = PRICING.sql[tier] || 14.99;
    
    document.getElementById('sqlCostPreview').textContent = `€${monthlyCost.toFixed(2)}/mois`;
    
    return {
        tier,
        monthly: monthlyCost
    };
}

function calculateHiddenCosts(config) {
    let total = 0;
    const costs = {};
    
    // Bandwidth costs (estimation: 10% des données en sortie)
    const bandwidthCost = (config.storage?.capacity || 100) * 0.1 * PRICING.hidden.bandwidth;
    costs.bandwidth = bandwidthCost;
    total += bandwidthCost;
    
    // Snapshot costs (estimation: 20% du stockage en snapshots)
    const snapshotCost = (config.storage?.capacity || 100) * 0.2 * PRICING.hidden.snapshot;
    costs.snapshot = snapshotCost;
    total += snapshotCost;
    
    // Load balancer pour AKS
    if (config.aks?.nodes && config.aks.nodes > 0) {
        costs.loadbalancer = PRICING.hidden.loadbalancer;
        total += PRICING.hidden.loadbalancer;
    }
    
    // Monitoring (par VM et node AKS)
    const vmCount = config.vm?.quantity || 0;
    const aksCount = config.aks?.nodes || 0;
    const monitoringCost = (vmCount + aksCount) * PRICING.hidden.monitoring;
    costs.monitoring = monitoringCost;
    total += monitoringCost;
    
    // Backup costs (estimation: 30% du stockage)
    const backupCost = (config.storage?.capacity || 100) * 0.3 * PRICING.hidden.backup;
    costs.backup = backupCost;
    total += backupCost;
    
    costs.total = total;
    return costs;
}

function calculateAllCosts() {
    // Récupération des configurations
    currentConfig = {
        vm: calculateVMCost(),
        aks: calculateAKSCost(),
        storage: calculateStorageCost(),
        sql: calculateSQLCost()
    };
    
    // Calcul des coûts cachés
    const hiddenCosts = calculateHiddenCosts(currentConfig);
    
    // Calcul du total
    const totalVM = currentConfig.vm.monthly || 0;
    const totalAKS = currentConfig.aks.monthly || 0;
    const totalStorage = currentConfig.storage.monthly || 0;
    const totalSQL = currentConfig.sql.monthly || 0;
    const totalHidden = hiddenCosts.total || 0;
    
    const totalCost = totalVM + totalAKS + totalStorage + totalSQL + totalHidden;
    
    // Mise à jour de l'interface
    updateCostDisplay(totalVM, totalAKS, totalStorage, totalSQL, totalHidden, totalCost);
    
    // Génération des recommandations
    generateRecommendations(currentConfig, totalCost);
    
    // Mise à jour du graphique
    updateCostChart(totalVM, totalAKS, totalStorage, totalSQL, totalHidden);
    
    // Calcul de la configuration optimisée
    calculateOptimizedConfig(currentConfig, totalCost);
}

function updateCostDisplay(vm, aks, storage, sql, hidden, total) {
    const formatter = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    document.getElementById('totalCost').textContent = `${formatter.format(total)}/mois`;
    document.getElementById('vmCostDetail').textContent = formatter.format(vm);
    document.getElementById('aksCostDetail').textContent = formatter.format(aks);
    document.getElementById('storageCostDetail').textContent = formatter.format(storage);
    document.getElementById('sqlCostDetail').textContent = formatter.format(sql);
    document.getElementById('hiddenCostDetail').textContent = formatter.format(hidden);
    
    // Mise à jour de la configuration actuelle
    document.getElementById('currentConfigCost').textContent = formatter.format(total);
    document.getElementById('currentVM').textContent = `VM: ${currentConfig.vm.size} x${currentConfig.vm.quantity}`;
    document.getElementById('currentStorage').textContent = `Stockage: ${currentConfig.storage.capacity}GB`;
}

function updateCostChart(vm, aks, storage, sql, hidden) {
    const ctx = document.getElementById('costChart').getContext('2d');
    
    if (costChart) {
        costChart.destroy();
    }
    
    const data = {
        labels: ['Machines Virtuelles', 'AKS', 'Stockage', 'SQL Database', 'Coûts Cachés'],
        datasets: [{
            data: [vm, aks, storage, sql, hidden],
            backgroundColor: [
                '#0078d4',  // Bleu Azure
                '#00b294',  // Vert
                '#ffb900',  // Jaune
                '#e81123',  // Rouge
                '#744da9'   // Violet
            ],
            borderWidth: 2,
            borderColor: '#fff',
            hoverOffset: 15
        }]
    };
    
    costChart = new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
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
            },
            cutout: '50%'
        }
    });
}

function generateRecommendations(config, totalCost) {
    const recommendations = [];
    
    // Analyse des VMs
    if (config.vm.size === 'B2s' && config.vm.hours === 24) {
        recommendations.push({
            icon: 'warning',
            text: 'Les VMs B2s ne sont pas recommandées pour la production 24/7. Passez à D2s v3 pour une meilleure stabilité.'
        });
    }
    
    if (config.vm.hours > 12 && config.vm.hours < 24) {
        recommendations.push({
            icon: 'lightbulb',
            text: 'Configurez l\'arrêt automatique des VMs la nuit pour économiser jusqu\'à 40% sur les coûts.'
        });
    }
    
    // Analyse du stockage
    if (config.storage.type === 'premium_lrs' && config.sql.tier !== 'premium_p1' && config.sql.tier !== 'premium_p2') {
        recommendations.push({
            icon: 'warning',
            text: 'Le stockage Premium est surdimensionné pour cette configuration. Passez en Standard LRS pour économiser jusqu\'à 70%.'
        });
    }
    
    if (config.storage.capacity > 500) {
        recommendations.push({
            icon: 'lightbulb',
            text: 'Activez le nettoyage automatique des logs et archives pour réduire votre stockage de 20-30%.'
        });
    }
    
    // Analyse AKS
    if (config.aks.nodes > 3 && config.aks.size === 'B2s') {
        recommendations.push({
            icon: 'warning',
            text: 'Pour un cluster de plus de 3 nodes, utilisez des nodes de taille D2s v3 ou supérieure.'
        });
    }
    
    // Calcul des économies potentielles
    const savings = calculatePotentialSavings(config, totalCost);
    
    // Mise à jour de l'interface
    const container = document.getElementById('recommendationsList');
    container.innerHTML = '';
    
    if (recommendations.length === 0) {
        container.innerHTML = `
            <div class="recommendation">
                <i class="fas fa-check-circle"></i>
                <p>Configuration optimale ! Aucune optimisation urgente nécessaire.</p>
            </div>
        `;
    } else {
        recommendations.forEach(rec => {
            const div = document.createElement('div');
            div.className = 'recommendation';
            div.innerHTML = `
                <i class="fas fa-${rec.icon}"></i>
                <p>${rec.text}</p>
            `;
            container.appendChild(div);
        });
    }
    
    // Mise à jour des économies
    document.getElementById('potentialSavings').textContent = `€${savings.toFixed(2)}/mois`;
}

function calculatePotentialSavings(config, totalCost) {
    let savings = 0;
    
    // Économies sur les VMs
    if (config.vm.size === 'B2s' && config.vm.hours === 24) {
        savings += config.vm.monthly * 0.3; // 30% d'économies
    }
    
    // Économies sur le stockage
    if (config.storage.type === 'premium_lrs' && !config.sql.tier.includes('premium')) {
        savings += config.storage.monthly * 0.7; // 70% d'économies
    }
    
    // Économies sur les heures
    if (config.vm.hours > 12) {
        const optimizedHours = Math.min(config.vm.hours, 12);
        savings += config.vm.monthly * (1 - (optimizedHours / config.vm.hours)) * 0.8;
    }
    
    // Minimum de 15% d'économies potentielles
    const minSavings = totalCost * 0.15;
    return Math.max(savings, minSavings);
}

function calculateOptimizedConfig(config, currentCost) {
    optimizedConfig = JSON.parse(JSON.stringify(config));
    
    // Optimisation des VMs
    if (optimizedConfig.vm.size === 'B2s' && optimizedConfig.vm.hours === 24) {
        optimizedConfig.vm.size = 'D2s_v3';
    }
    
    // Optimisation des heures (max 12h si > 12h)
    if (optimizedConfig.vm.hours > 12) {
        optimizedConfig.vm.hours = 12;
    }
    
    // Optimisation du stockage
    if (optimizedConfig.storage.type === 'premium_lrs' && !optimizedConfig.sql.tier.includes('premium')) {
        optimizedConfig.storage.type = 'standard_lrs';
    }
    
    // Optimisation de la capacité de stockage (réduction de 20%)
    optimizedConfig.storage.capacity = Math.max(10, Math.floor(optimizedConfig.storage.capacity * 0.8));
    
    // Recalcul des coûts optimisés
    const optimizedVMCost = calculateOptimizedVMCost(optimizedConfig.vm);
    const optimizedStorageCost = calculateOptimizedStorageCost(optimizedConfig.storage);
    const optimizedHiddenCosts = calculateHiddenCosts(optimizedConfig);
    
    const optimizedTotal = optimizedVMCost + (config.aks.monthly || 0) + 
                          optimizedStorageCost + (config.sql.monthly || 0) + 
                          optimizedHiddenCosts.total;
    
    // Mise à jour de l'interface
    const formatter = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    });
    
    document.getElementById('optimizedConfigCost').textContent = formatter.format(optimizedTotal);
    document.getElementById('optimizedVM').textContent = `Recommandé: ${optimizedConfig.vm.size}`;
    document.getElementById('optimizedStorage').textContent = `Optimisé: ${optimizedConfig.storage.capacity}GB`;
    
    // Calcul des économies
    const savings = currentCost - optimizedTotal;
    if (savings > 0) {
        document.getElementById('potentialSavings').textContent = `€${savings.toFixed(2)}/mois`;
    }
}

function calculateOptimizedVMCost(vmConfig) {
    const hourlyRate = PRICING.vm[vmConfig.size] || 0.119;
    const dailyCost = hourlyRate * vmConfig.quantity * vmConfig.hours;
    return dailyCost * 30;
}

function calculateOptimizedStorageCost(storageConfig) {
    const monthlyRate = PRICING.storage[storageConfig.type] || 0.018;
    return monthlyRate * storageConfig.capacity;
}

function applyOptimizations() {
    // Applique la configuration optimisée
    document.getElementById('vmSize').value = optimizedConfig.vm.size;
    document.getElementById('vmHoursSlider').value = optimizedConfig.vm.hours;
    document.getElementById('vmHoursValue').textContent = optimizedConfig.vm.hours;
    
    document.getElementById('storageType').value = optimizedConfig.storage.type;
    document.getElementById('storageSlider').value = optimizedConfig.storage.capacity;
    document.getElementById('storageValue').textContent = optimizedConfig.storage.capacity;
    
    // Recalcule tout
    calculateAllCosts();
    
    // Notification
    showNotification('Optimisations appliquées avec succès !', 'success');
}

function showNotification(message, type = 'info') {
    // Crée une notification temporaire
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#28a745' : '#0078d4'};
        color: white;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Ajoute les animations CSS
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
    
    .notification {
        font-weight: 600;
    }
`;
document.head.appendChild(style);

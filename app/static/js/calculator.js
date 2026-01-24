// Azure Cost Calculator - Enhanced JavaScript
let calculations = {};
let charts = {};

// Fonction utilitaire pour formater les prix
function formatPrice(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

// Fonction pour animer les compteurs
function animateCounter(element, start, end, duration) {
    let startTime = null;
    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = formatPrice(value);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Fonction pour afficher les résultats
function displayResult(elementId, data, componentType) {
    const resultDiv = document.getElementById(elementId);

    if (!data) {
        resultDiv.innerHTML = '<p class="error">Erreur de calcul</p>';
        resultDiv.classList.add('show');
        return;
    }

    // Sauvegarder le calcul
    calculations[componentType] = data;

    let html = '<h3>Estimation</h3>';

    // Affichage selon le type de composant
    if (componentType === 'vm') {
        html += `
            <p><strong>Configuration:</strong> ${data.quantity}x ${data.vm_size}</p>
            <p><strong>Ressources totales:</strong> ${data.cpu} vCPU, ${data.ram_gb} GB RAM</p>
        `;
    } else if (componentType === 'aks') {
        html += `
            <p><strong>Configuration:</strong> ${data.node_count} nodes ${data.node_size}</p>
            <p><strong>Ressources totales:</strong> ${data.cpu_total} vCPU, ${data.ram_total_gb} GB RAM</p>
            <p><strong>Gestion cluster:</strong> ${formatPrice(data.cluster_management_monthly)}/mois</p>
            <p><strong>Nodes:</strong> ${formatPrice(data.nodes_monthly)}/mois</p>
        `;
    } else if (componentType === 'storage') {
        html += `
            <p><strong>Type:</strong> ${data.storage_type}</p>
            <p><strong>Capacité:</strong> ${data.size_gb} GB</p>
        `;
    } else if (componentType === 'sql') {
        html += `
            <p><strong>Tier:</strong> ${data.tier}</p>
        `;
    }

    html += `
        <div class="price">
            <div>${formatPrice(data.monthly_cost)} / mois</div>
            <div style="font-size: 0.9rem; color: #666;">${formatPrice(data.yearly_cost)} / an</div>
        </div>
    `;

    resultDiv.innerHTML = html;
    resultDiv.classList.add('show');

    // Mettre à jour le total et afficher les résultats avancés
    updateTotal();
}

// Fonction pour mettre à jour le total
function updateTotal() {
    const totalDiv = document.getElementById('total-summary');
    const resultsSection = document.getElementById('results-section');

    const calcArray = Object.values(calculations);

    if (calcArray.length === 0) {
        resultsSection.style.display = 'none';
        return;
    }

    // Afficher la section résultats
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const totalMonthly = calcArray.reduce((sum, calc) => sum + calc.monthly_cost, 0);
    const totalYearly = calcArray.reduce((sum, calc) => sum + calc.yearly_cost, 0);

    let html = `
        <div class="total-price" id="total-price-counter">${formatPrice(totalMonthly)}</div>
        <p style="font-size: 1.3rem; color: #666;">${formatPrice(totalYearly)} / an</p>

        <div class="breakdown">
            <h4>Détail des composants :</h4>
    `;

    // Afficher chaque composant
    Object.entries(calculations).forEach(([type, data]) => {
        let label = type.toUpperCase();
        if (type === 'vm') label = `VM (${data.quantity}x ${data.vm_size})`;
        if (type === 'aks') label = `AKS (${data.node_count}x ${data.node_size})`;
        if (type === 'storage') label = `Storage (${data.size_gb}GB)`;
        if (type === 'sql') label = `SQL (${data.tier})`;

        html += `
            <div class="breakdown-item">
                <span>${label}</span>
                <span><strong>${formatPrice(data.monthly_cost)}</strong>/mois</span>
            </div>
        `;
    });

    html += '</div>';

    totalDiv.innerHTML = html;

    // Animer le compteur
    const priceElement = document.getElementById('total-price-counter');
    animateCounter(priceElement, 0, totalMonthly, 1500);

    // Mettre à jour tous les autres éléments
    updateProjection(totalMonthly, totalYearly);
    updateCharts(totalMonthly, totalYearly);
    generateOptimizations();
    calculateHiddenCosts(totalMonthly);
    displayComparison(totalMonthly, totalYearly);
}

// Fonction pour afficher la projection sur 3 ans
function updateProjection(monthly, yearly) {
    const projectionDiv = document.getElementById('projection-display');
    
    const year1 = yearly;
    const year2 = yearly * 2;
    const year3 = yearly * 3;

    projectionDiv.innerHTML = `
        <div class="projection-item">
            <div class="year">Année 1</div>
            <div class="amount">${formatPrice(year1)}</div>
        </div>
        <div class="projection-item">
            <div class="year">Année 2</div>
            <div class="amount">${formatPrice(year2)}</div>
        </div>
        <div class="projection-item">
            <div class="year">Année 3</div>
            <div class="amount">${formatPrice(year3)}</div>
        </div>
        <div class="projection-item" style="background: linear-gradient(135deg, #fff5e6 0%, #ffe6cc 100%);">
            <div class="year">Total 3 ans</div>
            <div class="amount" style="font-size: 1.8rem;">${formatPrice(year1 + year2 + year3)}</div>
        </div>
    `;
}

// Fonction pour créer/mettre à jour les graphiques
function updateCharts(monthly, yearly) {
    createPieChart();
    createProjectionChart(monthly, yearly);
    createEvolutionChart(yearly);
}

// Graphique camembert de répartition
function createPieChart() {
    const ctx = document.getElementById('costsPieChart');
    
    if (charts.pie) {
        charts.pie.destroy();
    }

    const labels = [];
    const data = [];
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'];

    Object.entries(calculations).forEach(([type, calc], index) => {
        let label = type.toUpperCase();
        if (type === 'vm') label = `VM (${calc.quantity}x)`;
        if (type === 'aks') label = `AKS (${calc.node_count} nodes)`;
        if (type === 'storage') label = `Storage`;
        if (type === 'sql') label = `SQL Database`;
        
        labels.push(label);
        data.push(calc.monthly_cost);
    });

    charts.pie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + formatPrice(context.parsed);
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true
            }
        }
    });
}

// Graphique projection mensuelle vs annuelle
function createProjectionChart(monthly, yearly) {
    const ctx = document.getElementById('projectionChart');
    
    if (charts.projection) {
        charts.projection.destroy();
    }

    charts.projection = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Coût Mensuel', 'Coût Annuel'],
            datasets: [{
                label: 'Montant (€)',
                data: [monthly, yearly],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.7)',
                    'rgba(118, 75, 162, 0.7)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(118, 75, 162, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatPrice(value);
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatPrice(context.parsed.y);
                        }
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Graphique évolution sur 3 ans
function createEvolutionChart(yearly) {
    const ctx = document.getElementById('evolutionChart');
    
    if (charts.evolution) {
        charts.evolution.destroy();
    }

    const year1 = yearly;
    const year2 = yearly * 2;
    const year3 = yearly * 3;

    charts.evolution = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Année 1', 'Année 2', 'Année 3'],
            datasets: [{
                label: 'Coûts cumulés',
                data: [year1, year2, year3],
                borderColor: 'rgba(255, 140, 0, 1)',
                backgroundColor: 'rgba(255, 140, 0, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatPrice(value);
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Total: ' + formatPrice(context.parsed.y);
                        }
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

// Générer les suggestions d'optimisation
function generateOptimizations() {
    const optimizationsDiv = document.getElementById('optimizations-list');
    let optimizations = [];

    // Vérifier VM 24/7
    if (calculations.vm && calculations.vm.hours_per_month === 720) {
        const savings = calculations.vm.monthly_cost * 0.5; // 50% d'économie si 12h/jour
        optimizations.push({
            title: '⏰ Optimisation temporelle des VMs',
            description: `Vos VMs tournent 24/7. Si vous les éteignez en dehors des heures ouvrées (12h/jour), vous économisez 50%.`,
            savings: savings * 12 // annuel
        });
    }

    // Vérifier utilisation de Reserved Instances
    const totalMonthly = Object.values(calculations).reduce((sum, calc) => sum + calc.monthly_cost, 0);
    if (totalMonthly > 100) {
        const savings = totalMonthly * 0.4 * 12; // 40% avec Reserved Instances
        optimizations.push({
            title: '💰 Reserved Instances (engagement 1 an)',
            description: `Avec un engagement 1 an sur vos ressources, Azure offre jusqu'à 40% de réduction. Pour vos coûts actuels, cela représente une économie significative.`,
            savings: savings
        });
    }

    // Vérifier oversizing VM
    if (calculations.vm && calculations.vm.vm_size.includes('D')) {
        const currentCost = calculations.vm.yearly_cost;
        const savings = currentCost * 0.4; // 40% moins cher avec série B
        optimizations.push({
            title: '📉 Downsizing des VMs',
            description: `Vous utilisez des VMs série D (performance). Si c'est pour dev/test, passez à la série B (burstable) pour économiser 40%.`,
            savings: savings
        });
    }

    // Vérifier storage GRS vs LRS
    if (calculations.storage && calculations.storage.storage_type.includes('GRS')) {
        const currentCost = calculations.storage.yearly_cost;
        const savings = currentCost * 0.5; // 50% moins cher avec LRS
        optimizations.push({
            title: '💾 Stockage GRS → LRS',
            description: `Vous utilisez du stockage géo-redondant (GRS). Si vous n'avez pas besoin de réplication géographique, passez à LRS (localement redondant) pour économiser 50%.`,
            savings: savings
        });
    }

    // Vérifier SQL Database tier
    if (calculations.sql && (calculations.sql.tier === 'P1' || calculations.sql.tier === 'S2')) {
        const savings = 3000; // Estimation
        optimizations.push({
            title: '🗄️ SQL Database - Elastic Pool',
            description: `Pour plusieurs bases de données, utilisez un Elastic Pool au lieu de DBs individuelles. Économie moyenne de 30-50%.`,
            savings: savings
        });
    }

    // Auto-scaling AKS
    if (calculations.aks) {
        const savings = calculations.aks.yearly_cost * 0.25;
        optimizations.push({
            title: '⚡ Auto-scaling AKS',
            description: `Configurez l'auto-scaling sur votre cluster AKS pour ajuster automatiquement le nombre de nodes selon la charge. Économie moyenne: 25%.`,
            savings: savings
        });
    }

    // Afficher les optimisations
    if (optimizations.length === 0) {
        optimizationsDiv.innerHTML = '<p style="text-align: center; color: #28a745;">✅ Votre configuration est déjà optimale !</p>';
    } else {
        let html = '';
        optimizations.forEach(opt => {
            html += `
                <div class="optimization-item">
                    <div class="title">${opt.title}</div>
                    <div class="description">${opt.description}</div>
                    <div class="savings">💰 Économie potentielle: ${formatPrice(opt.savings)}/an</div>
                </div>
            `;
        });
        optimizationsDiv.innerHTML = html;
    }
}

// Calculer les coûts cachés
function calculateHiddenCosts(monthlyBase) {
    const hiddenCostsDiv = document.getElementById('hidden-costs-list');
    
    // Estimation des coûts cachés (25-35% du coût de base)
    const bandwidth = monthlyBase * 0.10; // 10% pour bande passante sortante
    const backups = monthlyBase * 0.08;   // 8% pour sauvegardes
    const monitoring = monthlyBase * 0.05; // 5% pour monitoring/diagnostics
    const loadBalancer = monthlyBase * 0.07; // 7% pour load balancers/IP publiques

    const totalHidden = bandwidth + backups + monitoring + loadBalancer;

    let html = `
        <div class="hidden-cost-item">
            <div class="title">🌐 Bande passante sortante (Egress)</div>
            <div class="description">Transferts de données hors d'Azure. Souvent négligé, mais peut représenter 10% du coût total.</div>
            <div class="amount">~${formatPrice(bandwidth * 12)}/an</div>
        </div>
        <div class="hidden-cost-item">
            <div class="title">💾 Sauvegardes automatiques</div>
            <div class="description">Snapshots, Azure Backup, rétention des données. Coûts qui s'accumulent rapidement.</div>
            <div class="amount">~${formatPrice(backups * 12)}/an</div>
        </div>
        <div class="hidden-cost-item">
            <div class="title">📊 Monitoring et diagnostics</div>
            <div class="description">Log Analytics, Application Insights, métriques étendues.</div>
            <div class="amount">~${formatPrice(monitoring * 12)}/an</div>
        </div>
        <div class="hidden-cost-item">
            <div class="title">⚖️ Load Balancers et IPs publiques</div>
            <div class="description">Coûts des load balancers, IP publiques statiques, NAT Gateway.</div>
            <div class="amount">~${formatPrice(loadBalancer * 12)}/an</div>
        </div>
        <div style="text-align: center; margin-top: 25px; padding: 20px; background: linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%); border-radius: 10px;">
            <div style="font-size: 1.1rem; color: #dc3545; font-weight: 600;">Total coûts cachés estimés</div>
            <div style="font-size: 2rem; font-weight: 700; color: #dc3545; margin-top: 10px;">~${formatPrice(totalHidden * 12)}/an</div>
            <div style="font-size: 0.9rem; color: #721c24; margin-top: 10px;">Soit ~${Math.round((totalHidden / monthlyBase) * 100)}% de vos coûts visibles</div>
        </div>
    `;

    hiddenCostsDiv.innerHTML = html;
}

// Afficher la comparaison avant/après
function displayComparison(monthly, yearly) {
    const comparisonDiv = document.getElementById('comparison-display');
    
    // Calcul des économies potentielles (on prend 35% d'économie moyenne)
    const optimizedMonthly = monthly * 0.65; // 35% d'économie
    const optimizedYearly = yearly * 0.65;
    const savingsYearly = yearly - optimizedYearly;

    comparisonDiv.innerHTML = `
        <div class="comparison-grid">
            <div class="comparison-column before">
                <h3>❌ Configuration Actuelle</h3>
                <div class="amount">${formatPrice(monthly)}</div>
                <p>par mois</p>
                <div style="margin-top: 10px; font-size: 1.1rem;">${formatPrice(yearly)}/an</div>
            </div>
            
            <div class="comparison-arrow">→</div>
            
            <div class="comparison-column after">
                <h3>✅ Après Optimisation</h3>
                <div class="amount">${formatPrice(optimizedMonthly)}</div>
                <p>par mois</p>
                <div style="margin-top: 10px; font-size: 1.1rem;">${formatPrice(optimizedYearly)}/an</div>
            </div>
            
            <div class="comparison-savings">
                <div class="label">💰 Économies réalisées</div>
                <div class="amount">${formatPrice(savingsYearly)}/an</div>
                <p style="margin-top: 10px; color: #ff8c00;">Soit une réduction de 35% de vos coûts cloud</p>
            </div>
        </div>
    `;
}

// Handler VM Form
document.getElementById('vm-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
        vm_size: formData.get('vm_size'),
        quantity: parseInt(formData.get('quantity')),
        hours_per_day: parseInt(formData.get('hours_per_day')),
        days_per_month: 30
    };

    try {
        const response = await fetch('/api/calculate/vm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        displayResult('vm-result', result, 'vm');
    } catch (error) {
        console.error('Error:', error);
    }
});

// Handler AKS Form
document.getElementById('aks-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
        node_size: formData.get('node_size'),
        node_count: parseInt(formData.get('node_count')),
        hours_per_day: parseInt(formData.get('hours_per_day')),
        days_per_month: 30
    };

    try {
        const response = await fetch('/api/calculate/aks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        displayResult('aks-result', result, 'aks');
    } catch (error) {
        console.error('Error:', error);
    }
});

// Handler Storage Form
document.getElementById('storage-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
        storage_type: formData.get('storage_type'),
        size_gb: parseInt(formData.get('size_gb'))
    };

    try {
        const response = await fetch('/api/calculate/storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        displayResult('storage-result', result, 'storage');
    } catch (error) {
        console.error('Error:', error);
    }
});

// Handler SQL Form
document.getElementById('sql-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
        tier: formData.get('tier')
    };

    try {
        const response = await fetch('/api/calculate/sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        displayResult('sql-result', result, 'sql');
    } catch (error) {
        console.error('Error:', error);
    }
});
EOFcat > static/js/calculator.js << 'EOF'
// Azure Cost Calculator - Enhanced JavaScript
let calculations = {};
let charts = {};

// Fonction utilitaire pour formater les prix
function formatPrice(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
}

// Fonction pour animer les compteurs
function animateCounter(element, start, end, duration) {
    let startTime = null;
    const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        element.textContent = formatPrice(value);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Fonction pour afficher les résultats
function displayResult(elementId, data, componentType) {
    const resultDiv = document.getElementById(elementId);

    if (!data) {
        resultDiv.innerHTML = '<p class="error">Erreur de calcul</p>';
        resultDiv.classList.add('show');
        return;
    }

    // Sauvegarder le calcul
    calculations[componentType] = data;

    let html = '<h3>Estimation</h3>';

    // Affichage selon le type de composant
    if (componentType === 'vm') {
        html += `
            <p><strong>Configuration:</strong> ${data.quantity}x ${data.vm_size}</p>
            <p><strong>Ressources totales:</strong> ${data.cpu} vCPU, ${data.ram_gb} GB RAM</p>
        `;
    } else if (componentType === 'aks') {
        html += `
            <p><strong>Configuration:</strong> ${data.node_count} nodes ${data.node_size}</p>
            <p><strong>Ressources totales:</strong> ${data.cpu_total} vCPU, ${data.ram_total_gb} GB RAM</p>
            <p><strong>Gestion cluster:</strong> ${formatPrice(data.cluster_management_monthly)}/mois</p>
            <p><strong>Nodes:</strong> ${formatPrice(data.nodes_monthly)}/mois</p>
        `;
    } else if (componentType === 'storage') {
        html += `
            <p><strong>Type:</strong> ${data.storage_type}</p>
            <p><strong>Capacité:</strong> ${data.size_gb} GB</p>
        `;
    } else if (componentType === 'sql') {
        html += `
            <p><strong>Tier:</strong> ${data.tier}</p>
        `;
    }

    html += `
        <div class="price">
            <div>${formatPrice(data.monthly_cost)} / mois</div>
            <div style="font-size: 0.9rem; color: #666;">${formatPrice(data.yearly_cost)} / an</div>
        </div>
    `;

    resultDiv.innerHTML = html;
    resultDiv.classList.add('show');

    // Mettre à jour le total et afficher les résultats avancés
    updateTotal();
}

// Fonction pour mettre à jour le total
function updateTotal() {
    const totalDiv = document.getElementById('total-summary');
    const resultsSection = document.getElementById('results-section');

    const calcArray = Object.values(calculations);

    if (calcArray.length === 0) {
        resultsSection.style.display = 'none';
        return;
    }

    // Afficher la section résultats
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const totalMonthly = calcArray.reduce((sum, calc) => sum + calc.monthly_cost, 0);
    const totalYearly = calcArray.reduce((sum, calc) => sum + calc.yearly_cost, 0);

    let html = `
        <div class="total-price" id="total-price-counter">${formatPrice(totalMonthly)}</div>
        <p style="font-size: 1.3rem; color: #666;">${formatPrice(totalYearly)} / an</p>

        <div class="breakdown">
            <h4>Détail des composants :</h4>
    `;

    // Afficher chaque composant
    Object.entries(calculations).forEach(([type, data]) => {
        let label = type.toUpperCase();
        if (type === 'vm') label = `VM (${data.quantity}x ${data.vm_size})`;
        if (type === 'aks') label = `AKS (${data.node_count}x ${data.node_size})`;
        if (type === 'storage') label = `Storage (${data.size_gb}GB)`;
        if (type === 'sql') label = `SQL (${data.tier})`;

        html += `
            <div class="breakdown-item">
                <span>${label}</span>
                <span><strong>${formatPrice(data.monthly_cost)}</strong>/mois</span>
            </div>
        `;
    });

    html += '</div>';

    totalDiv.innerHTML = html;

    // Animer le compteur
    const priceElement = document.getElementById('total-price-counter');
    animateCounter(priceElement, 0, totalMonthly, 1500);

    // Mettre à jour tous les autres éléments
    updateProjection(totalMonthly, totalYearly);
    updateCharts(totalMonthly, totalYearly);
    generateOptimizations();
    calculateHiddenCosts(totalMonthly);
    displayComparison(totalMonthly, totalYearly);
}

// Fonction pour afficher la projection sur 3 ans
function updateProjection(monthly, yearly) {
    const projectionDiv = document.getElementById('projection-display');
    
    const year1 = yearly;
    const year2 = yearly * 2;
    const year3 = yearly * 3;

    projectionDiv.innerHTML = `
        <div class="projection-item">
            <div class="year">Année 1</div>
            <div class="amount">${formatPrice(year1)}</div>
        </div>
        <div class="projection-item">
            <div class="year">Année 2</div>
            <div class="amount">${formatPrice(year2)}</div>
        </div>
        <div class="projection-item">
            <div class="year">Année 3</div>
            <div class="amount">${formatPrice(year3)}</div>
        </div>
        <div class="projection-item" style="background: linear-gradient(135deg, #fff5e6 0%, #ffe6cc 100%);">
            <div class="year">Total 3 ans</div>
            <div class="amount" style="font-size: 1.8rem;">${formatPrice(year1 + year2 + year3)}</div>
        </div>
    `;
}

// Fonction pour créer/mettre à jour les graphiques
function updateCharts(monthly, yearly) {
    createPieChart();
    createProjectionChart(monthly, yearly);
    createEvolutionChart(yearly);
}

// Graphique camembert de répartition
function createPieChart() {
    const ctx = document.getElementById('costsPieChart');
    
    if (charts.pie) {
        charts.pie.destroy();
    }

    const labels = [];
    const data = [];
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b'];

    Object.entries(calculations).forEach(([type, calc], index) => {
        let label = type.toUpperCase();
        if (type === 'vm') label = `VM (${calc.quantity}x)`;
        if (type === 'aks') label = `AKS (${calc.node_count} nodes)`;
        if (type === 'storage') label = `Storage`;
        if (type === 'sql') label = `SQL Database`;
        
        labels.push(label);
        data.push(calc.monthly_cost);
    });

    charts.pie = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, data.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: { size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + formatPrice(context.parsed);
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true
            }
        }
    });
}

// Graphique projection mensuelle vs annuelle
function createProjectionChart(monthly, yearly) {
    const ctx = document.getElementById('projectionChart');
    
    if (charts.projection) {
        charts.projection.destroy();
    }

    charts.projection = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Coût Mensuel', 'Coût Annuel'],
            datasets: [{
                label: 'Montant (€)',
                data: [monthly, yearly],
                backgroundColor: [
                    'rgba(102, 126, 234, 0.7)',
                    'rgba(118, 75, 162, 0.7)'
                ],
                borderColor: [
                    'rgba(102, 126, 234, 1)',
                    'rgba(118, 75, 162, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatPrice(value);
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return formatPrice(context.parsed.y);
                        }
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
}

// Graphique évolution sur 3 ans
function createEvolutionChart(yearly) {
    const ctx = document.getElementById('evolutionChart');
    
    if (charts.evolution) {
        charts.evolution.destroy();
    }

    const year1 = yearly;
    const year2 = yearly * 2;
    const year3 = yearly * 3;

    charts.evolution = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Année 1', 'Année 2', 'Année 3'],
            datasets: [{
                label: 'Coûts cumulés',
                data: [year1, year2, year3],
                borderColor: 'rgba(255, 140, 0, 1)',
                backgroundColor: 'rgba(255, 140, 0, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatPrice(value);
                        }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Total: ' + formatPrice(context.parsed.y);
                        }
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

// Générer les suggestions d'optimisation
function generateOptimizations() {
    const optimizationsDiv = document.getElementById('optimizations-list');
    let optimizations = [];

    // Vérifier VM 24/7
    if (calculations.vm && calculations.vm.hours_per_month === 720) {
        const savings = calculations.vm.monthly_cost * 0.5; // 50% d'économie si 12h/jour
        optimizations.push({
            title: '⏰ Optimisation temporelle des VMs',
            description: `Vos VMs tournent 24/7. Si vous les éteignez en dehors des heures ouvrées (12h/jour), vous économisez 50%.`,
            savings: savings * 12 // annuel
        });
    }

    // Vérifier utilisation de Reserved Instances
    const totalMonthly = Object.values(calculations).reduce((sum, calc) => sum + calc.monthly_cost, 0);
    if (totalMonthly > 100) {
        const savings = totalMonthly * 0.4 * 12; // 40% avec Reserved Instances
        optimizations.push({
            title: '💰 Reserved Instances (engagement 1 an)',
            description: `Avec un engagement 1 an sur vos ressources, Azure offre jusqu'à 40% de réduction. Pour vos coûts actuels, cela représente une économie significative.`,
            savings: savings
        });
    }

    // Vérifier oversizing VM
    if (calculations.vm && calculations.vm.vm_size.includes('D')) {
        const currentCost = calculations.vm.yearly_cost;
        const savings = currentCost * 0.4; // 40% moins cher avec série B
        optimizations.push({
            title: '📉 Downsizing des VMs',
            description: `Vous utilisez des VMs série D (performance). Si c'est pour dev/test, passez à la série B (burstable) pour économiser 40%.`,
            savings: savings
        });
    }

    // Vérifier storage GRS vs LRS
    if (calculations.storage && calculations.storage.storage_type.includes('GRS')) {
        const currentCost = calculations.storage.yearly_cost;
        const savings = currentCost * 0.5; // 50% moins cher avec LRS
        optimizations.push({
            title: '💾 Stockage GRS → LRS',
            description: `Vous utilisez du stockage géo-redondant (GRS). Si vous n'avez pas besoin de réplication géographique, passez à LRS (localement redondant) pour économiser 50%.`,
            savings: savings
        });
    }

    // Vérifier SQL Database tier
    if (calculations.sql && (calculations.sql.tier === 'P1' || calculations.sql.tier === 'S2')) {
        const savings = 3000; // Estimation
        optimizations.push({
            title: '🗄️ SQL Database - Elastic Pool',
            description: `Pour plusieurs bases de données, utilisez un Elastic Pool au lieu de DBs individuelles. Économie moyenne de 30-50%.`,
            savings: savings
        });
    }

    // Auto-scaling AKS
    if (calculations.aks) {
        const savings = calculations.aks.yearly_cost * 0.25;
        optimizations.push({
            title: '⚡ Auto-scaling AKS',
            description: `Configurez l'auto-scaling sur votre cluster AKS pour ajuster automatiquement le nombre de nodes selon la charge. Économie moyenne: 25%.`,
            savings: savings
        });
    }

    // Afficher les optimisations
    if (optimizations.length === 0) {
        optimizationsDiv.innerHTML = '<p style="text-align: center; color: #28a745;">✅ Votre configuration est déjà optimale !</p>';
    } else {
        let html = '';
        optimizations.forEach(opt => {
            html += `
                <div class="optimization-item">
                    <div class="title">${opt.title}</div>
                    <div class="description">${opt.description}</div>
                    <div class="savings">💰 Économie potentielle: ${formatPrice(opt.savings)}/an</div>
                </div>
            `;
        });
        optimizationsDiv.innerHTML = html;
    }
}

// Calculer les coûts cachés
function calculateHiddenCosts(monthlyBase) {
    const hiddenCostsDiv = document.getElementById('hidden-costs-list');
    
    // Estimation des coûts cachés (25-35% du coût de base)
    const bandwidth = monthlyBase * 0.10; // 10% pour bande passante sortante
    const backups = monthlyBase * 0.08;   // 8% pour sauvegardes
    const monitoring = monthlyBase * 0.05; // 5% pour monitoring/diagnostics
    const loadBalancer = monthlyBase * 0.07; // 7% pour load balancers/IP publiques

    const totalHidden = bandwidth + backups + monitoring + loadBalancer;

    let html = `
        <div class="hidden-cost-item">
            <div class="title">🌐 Bande passante sortante (Egress)</div>
            <div class="description">Transferts de données hors d'Azure. Souvent négligé, mais peut représenter 10% du coût total.</div>
            <div class="amount">~${formatPrice(bandwidth * 12)}/an</div>
        </div>
        <div class="hidden-cost-item">
            <div class="title">💾 Sauvegardes automatiques</div>
            <div class="description">Snapshots, Azure Backup, rétention des données. Coûts qui s'accumulent rapidement.</div>
            <div class="amount">~${formatPrice(backups * 12)}/an</div>
        </div>
        <div class="hidden-cost-item">
            <div class="title">📊 Monitoring et diagnostics</div>
            <div class="description">Log Analytics, Application Insights, métriques étendues.</div>
            <div class="amount">~${formatPrice(monitoring * 12)}/an</div>
        </div>
        <div class="hidden-cost-item">
            <div class="title">⚖️ Load Balancers et IPs publiques</div>
            <div class="description">Coûts des load balancers, IP publiques statiques, NAT Gateway.</div>
            <div class="amount">~${formatPrice(loadBalancer * 12)}/an</div>
        </div>
        <div style="text-align: center; margin-top: 25px; padding: 20px; background: linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%); border-radius: 10px;">
            <div style="font-size: 1.1rem; color: #dc3545; font-weight: 600;">Total coûts cachés estimés</div>
            <div style="font-size: 2rem; font-weight: 700; color: #dc3545; margin-top: 10px;">~${formatPrice(totalHidden * 12)}/an</div>
            <div style="font-size: 0.9rem; color: #721c24; margin-top: 10px;">Soit ~${Math.round((totalHidden / monthlyBase) * 100)}% de vos coûts visibles</div>
        </div>
    `;

    hiddenCostsDiv.innerHTML = html;
}

// Afficher la comparaison avant/après
function displayComparison(monthly, yearly) {
    const comparisonDiv = document.getElementById('comparison-display');
    
    // Calcul des économies potentielles (on prend 35% d'économie moyenne)
    const optimizedMonthly = monthly * 0.65; // 35% d'économie
    const optimizedYearly = yearly * 0.65;
    const savingsYearly = yearly - optimizedYearly;

    comparisonDiv.innerHTML = `
        <div class="comparison-grid">
            <div class="comparison-column before">
                <h3>❌ Configuration Actuelle</h3>
                <div class="amount">${formatPrice(monthly)}</div>
                <p>par mois</p>
                <div style="margin-top: 10px; font-size: 1.1rem;">${formatPrice(yearly)}/an</div>
            </div>
            
            <div class="comparison-arrow">→</div>
            
            <div class="comparison-column after">
                <h3>✅ Après Optimisation</h3>
                <div class="amount">${formatPrice(optimizedMonthly)}</div>
                <p>par mois</p>
                <div style="margin-top: 10px; font-size: 1.1rem;">${formatPrice(optimizedYearly)}/an</div>
            </div>
            
            <div class="comparison-savings">
                <div class="label">💰 Économies réalisées</div>
                <div class="amount">${formatPrice(savingsYearly)}/an</div>
                <p style="margin-top: 10px; color: #ff8c00;">Soit une réduction de 35% de vos coûts cloud</p>
            </div>
        </div>
    `;
}

// Handler VM Form
document.getElementById('vm-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
        vm_size: formData.get('vm_size'),
        quantity: parseInt(formData.get('quantity')),
        hours_per_day: parseInt(formData.get('hours_per_day')),
        days_per_month: 30
    };

    try {
        const response = await fetch('/api/calculate/vm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        displayResult('vm-result', result, 'vm');
    } catch (error) {
        console.error('Error:', error);
    }
});

// Handler AKS Form
document.getElementById('aks-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
        node_size: formData.get('node_size'),
        node_count: parseInt(formData.get('node_count')),
        hours_per_day: parseInt(formData.get('hours_per_day')),
        days_per_month: 30
    };

    try {
        const response = await fetch('/api/calculate/aks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        displayResult('aks-result', result, 'aks');
    } catch (error) {
        console.error('Error:', error);
    }
});

// Handler Storage Form
document.getElementById('storage-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
        storage_type: formData.get('storage_type'),
        size_gb: parseInt(formData.get('size_gb'))
    };

    try {
        const response = await fetch('/api/calculate/storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        displayResult('storage-result', result, 'storage');
    } catch (error) {
        console.error('Error:', error);
    }
});

// Handler SQL Form
document.getElementById('sql-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = {
        tier: formData.get('tier')
    };

    try {
        const response = await fetch('/api/calculate/sql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        displayResult('sql-result', result, 'sql');
    } catch (error) {
        console.error('Error:', error);
    }
});

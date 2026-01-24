// Azure Cost Calculator - JavaScript
let calculations = {};

// Fonction utilitaire pour formater les prix
function formatPrice(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR'
    }).format(amount);
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
    
    // Mettre à jour le total
    updateTotal();
}

// Fonction pour mettre à jour le total
function updateTotal() {
    const totalDiv = document.getElementById('total-summary');
    const btnContact = document.getElementById('btn-contact');
    
    const calcArray = Object.values(calculations);
    
    if (calcArray.length === 0) {
        totalDiv.innerHTML = '<p class="info">Calculez au moins un composant pour voir le total</p>';
        btnContact.style.display = 'none';
        return;
    }
    
    const totalMonthly = calcArray.reduce((sum, calc) => sum + calc.monthly_cost, 0);
    const totalYearly = calcArray.reduce((sum, calc) => sum + calc.yearly_cost, 0);
    
    let html = `
        <div class="total-price">${formatPrice(totalMonthly)} / mois</div>
        <p style="font-size: 1.2rem; color: #666;">${formatPrice(totalYearly)} / an</p>
        
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
    btnContact.style.display = 'block';
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

// Handler bouton contact
document.getElementById('btn-contact').addEventListener('click', () => {
    window.location.href = 'https://pierre-devops.com#contact';
});

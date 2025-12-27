"""
Tarifs Azure - Région West Europe
Mise à jour facile des prix
"""

# Tarifs VMs (€/heure)
VM_PRICING = {
    'B1s': {'cpu': 1, 'ram': 1, 'price_hour': 0.0104},
    'B2s': {'cpu': 2, 'ram': 4, 'price_hour': 0.0416},
    'B2ms': {'cpu': 2, 'ram': 8, 'price_hour': 0.0832},
    'D2s_v3': {'cpu': 2, 'ram': 8, 'price_hour': 0.096},
    'D4s_v3': {'cpu': 4, 'ram': 16, 'price_hour': 0.192},
    'D8s_v3': {'cpu': 8, 'ram': 32, 'price_hour': 0.384},
}

# Tarifs AKS (€/heure - prix du cluster management + nodes)
AKS_PRICING = {
    'cluster_management': 0.10,  # Frais de gestion cluster
    'node_pools': VM_PRICING  # Utilise les mêmes tarifs que les VMs
}

# Tarifs Storage (€/GB/mois)
STORAGE_PRICING = {
    'Standard_LRS': 0.018,
    'Standard_GRS': 0.036,
    'Premium_LRS': 0.15,
    'Premium_ZRS': 0.19,
}

# Tarifs Azure Functions
FUNCTIONS_PRICING = {
    'consumption': {
        'execution_price': 0.000014,  # par exécution
        'gb_second_price': 0.000014,   # par GB-seconde
        'free_executions': 1000000,    # 1M gratuit/mois
        'free_gb_seconds': 400000      # 400k GB-s gratuit/mois
    },
    'premium': {
        'EP1': 0.169,  # €/heure
        'EP2': 0.338,
        'EP3': 0.676
    }
}

# Tarifs SQL Database (€/mois)
SQL_PRICING = {
    'Basic': 4.99,
    'S0': 14.99,
    'S1': 29.99,
    'S2': 74.99,
    'P1': 464.99,
}

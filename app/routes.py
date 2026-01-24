from flask import jsonify, request
import random
from datetime import datetime

# Prix Azure approximatifs (€)
PRICES = {
    'vm': {
        'B2s': 0.0416,
        'D2s_v3': 0.119,
        'D4s_v3': 0.238,
        'E4s_v3': 0.284
    },
    'aks': {
        'B2s': 0.0416,
        'D2s_v3': 0.119,
        'D4s_v3': 0.238
    },
    'storage': {
        'Standard_LRS': 0.018,
        'Standard_GRS': 0.036,
        'Premium_LRS': 0.154,
        'Premium_ZRS': 0.185
    },
    'database': {
        'none': 0,
        'sql_basic': 5.99,
        'sql_standard': 14.99,
        'cosmos_db': 24.99,
        'mysql': 9.99
    },
    'backup': 0.10,  # €/GB/mois
    'bandwidth': 0.087,
    'monitoring': 2.49
}

def register_routes(app):
    
    @app.route('/api/calculate', methods=['POST'])
    def calculate_costs():
        """Calcule les coûts Azure basés sur la configuration"""
        try:
            config = request.get_json()
            
            if not config:
                return jsonify({'error': 'No configuration provided'}), 400
            
            # Calcul des coûts VM
            vm_hourly = PRICES['vm'].get(config.get('vm', {}).get('size', 'D2s_v3'), 0.119)
            vm_hours = config.get('vm', {}).get('hours', 24)
            vm_count = config.get('vm', {}).get('count', 2)
            vm_cost = vm_hourly * vm_hours * vm_count * 30  # Mois de 30 jours
            
            # Calcul des coûts AKS
            aks_hourly = PRICES['aks'].get(config.get('aks', {}).get('size', 'D2s_v3'), 0.119)
            aks_nodes = config.get('aks', {}).get('nodes', 3)
            aks_cost = aks_hourly * 24 * aks_nodes * 30  # AKS tourne 24/7
            
            # Calcul des coûts stockage
            storage_type = config.get('storage', {}).get('type', 'Standard_GRS')
            storage_size = config.get('storage', {}).get('size', 256)
            storage_rate = PRICES['storage'].get(storage_type, 0.036)
            storage_cost = storage_rate * storage_size
            
            # Backup si activé
            if config.get('storage', {}).get('backup', True):
                storage_cost += storage_size * PRICES['backup']
            
            # Calcul des coûts base de données
            db_type = config.get('database', {}).get('type', 'sql_standard')
            db_cost = PRICES['database'].get(db_type, 14.99)
            
            # Backup DB si activé
            if config.get('database', {}).get('backup', True):
                db_cost *= 1.2  # +20% pour backup
            
            # Coûts cachés (bandwidth, monitoring, etc.)
            hidden_costs = (
                (storage_size * 0.1 * PRICES['bandwidth']) +  # 10% de bandwidth
                ((vm_count + aks_nodes) * PRICES['monitoring']) +  # Monitoring
                (storage_size * 0.2 * 0.05)  # Snapshots (20% du stockage à 0.05€/GB)
            )
            
            # Total
            total = vm_cost + aks_cost + storage_cost + db_cost + hidden_costs
            
            response = {
                'success': True,
                'vm': round(vm_cost, 2),
                'aks': round(aks_cost, 2),
                'storage': round(storage_cost, 2),
                'database': round(db_cost, 2),
                'hidden': round(hidden_costs, 2),
                'total': round(total, 2),
                'breakdown': {
                    'vm_percent': round((vm_cost / total) * 100, 1) if total > 0 else 0,
                    'storage_percent': round((storage_cost / total) * 100, 1) if total > 0 else 0,
                    'aks_percent': round((aks_cost / total) * 100, 1) if total > 0 else 0,
                    'db_percent': round((db_cost / total) * 100, 1) if total > 0 else 0,
                    'hidden_percent': round((hidden_costs / total) * 100, 1) if total > 0 else 0
                },
                'timestamp': datetime.now().isoformat()
            }
            
            return jsonify(response)
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Erreur lors du calcul des coûts'
            }), 500
    
    @app.route('/api/optimize', methods=['POST'])
    def optimize_config():
        """Retourne une configuration optimisée"""
        try:
            config = request.get_json()
            
            if not config:
                return jsonify({'error': 'No configuration provided'}), 400
            
            # Crée une copie optimisée
            optimized = config.copy()
            
            # Optimisations automatiques
            if optimized.get('vm', {}).get('hours', 24) > 12:
                optimized['vm']['hours'] = 12
            
            if optimized.get('aks', {}).get('nodes', 3) > 2:
                optimized['aks']['nodes'] = 2
            
            if optimized.get('storage', {}).get('type') == 'Premium_LRS':
                optimized['storage']['type'] = 'Standard_GRS'
            
            # Réduction de la taille du stockage si > 500GB
            if optimized.get('storage', {}).get('size', 256) > 500:
                optimized['storage']['size'] = max(100, int(optimized['storage']['size'] * 0.7))
            
            return jsonify({
                'success': True,
                'optimized': optimized,
                'recommendations': [
                    'Réduction des heures de VM de 24h à 12h',
                    'Optimisation du type de stockage',
                    'Réduction du nombre de nodes AKS',
                    'Nettoyage automatique du stockage configuré'
                ]
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/health')
    def health_check():
        """Endpoint de santé"""
        return jsonify({
            'status': 'healthy',
            'service': 'azure-cost-calculator',
            'version': '2.0',
            'timestamp': datetime.now().isoformat()
        })

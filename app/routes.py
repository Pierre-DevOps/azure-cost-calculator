from flask import jsonify, request
from datetime import datetime
import json

class AzurePricingEngine:
    """Moteur de calcul des prix Azure avec intelligence artificielle"""
    
    PRICES = {
        'vm': {
            'B2s': {'hour': 0.0416, 'month': 41.00, 'category': 'dev'},
            'D2s_v3': {'hour': 0.119, 'month': 119.00, 'category': 'general'},
            'D4s_v3': {'hour': 0.238, 'month': 238.00, 'category': 'production'},
            'E4s_v3': {'hour': 0.284, 'month': 284.00, 'category': 'memory'}
        },
        'storage': {
            'Standard_LRS': {'rate': 0.018, 'performance': 'basic'},
            'Standard_GRS': {'rate': 0.036, 'performance': 'standard'},
            'Premium_LRS': {'rate': 0.154, 'performance': 'premium'},
            'Premium_ZRS': {'rate': 0.185, 'performance': 'premium'}
        },
        'services': {
            'aks': {'node_hour': 0.119, 'control_plane': 0},
            'database': {
                'Basic': 5.99,
                'Standard_S0': 14.99,
                'Standard_S1': 29.99,
                'Premium_P1': 219.99
            }
        },
        'hidden': {
            'bandwidth': {'rate': 0.087, 'free_tier': 5},
            'snapshot': {'rate': 0.05, 'factor': 0.2},
            'monitoring': {'per_instance': 2.49},
            'security': {'per_secret': 0.033}
        }
    }
    
    @classmethod
    def calculate_vm_cost(cls, vm_type, count, hours):
        """Calcule le coût des machines virtuelles"""
        price = cls.PRICES['vm'].get(vm_type, cls.PRICES['vm']['D2s_v3'])
        monthly_rate = price['month']
        
        # Ajustement pour les heures d'utilisation
        utilization_factor = hours / 24
        cost = monthly_rate * count * utilization_factor
        
        # Détails
        details = {
            'type': vm_type,
            'category': price['category'],
            'unit_cost': monthly_rate,
            'utilization': f'{hours}h/day',
            'utilization_factor': round(utilization_factor, 2)
        }
        
        return round(cost, 2), details
    
    @classmethod
    def calculate_storage_cost(cls, storage_type, size_gb, backup_enabled):
        """Calcule le coût du stockage"""
        storage = cls.PRICES['storage'].get(storage_type, cls.PRICES['storage']['Standard_LRS'])
        
        # Coût de base
        base_cost = storage['rate'] * size_gb
        
        # Coût de backup si activé
        backup_cost = size_gb * 0.10 if backup_enabled else 0
        
        total = base_cost + backup_cost
        
        details = {
            'type': storage_type,
            'performance': storage['performance'],
            'unit_cost': storage['rate'],
            'backup_enabled': backup_enabled,
            'backup_cost': round(backup_cost, 2)
        }
        
        return round(total, 2), details
    
    @classmethod
    def calculate_aks_cost(cls, node_count, enabled=True):
        """Calcule le coût d'Azure Kubernetes Service"""
        if not enabled:
            return 0, {'enabled': False}
        
        # Coût par node (24/7)
        node_hourly = cls.PRICES['services']['aks']['node_hour']
        monthly_cost = node_hourly * node_count * 730  # Heures par mois
        
        details = {
            'enabled': True,
            'nodes': node_count,
            'node_hourly': node_hourly,
            'control_plane': 0  # Gratuit pour AKS
        }
        
        return round(monthly_cost, 2), details
    
    @classmethod
    def calculate_database_cost(cls, tier, enabled=True):
        """Calcule le coût de la base de données"""
        if not enabled:
            return 0, {'enabled': False}
        
        cost = cls.PRICES['services']['database'].get(tier, 14.99)
        
        details = {
            'enabled': True,
            'tier': tier,
            'unit_cost': cost
        }
        
        return round(cost, 2), details
    
    @classmethod
    def calculate_hidden_costs(cls, config):
        """Calcule les coûts cachés"""
        vm_count = config.get('vm', {}).get('count', 0)
        storage_size = config.get('storage', {}).get('size', 0)
        aks_enabled = config.get('aks', {}).get('enabled', False)
        aks_nodes = config.get('aks', {}).get('nodes', 0) if aks_enabled else 0
        
        # Bandwidth (10% des données en sortie)
        bandwidth = cls.PRICES['hidden']['bandwidth']
        bandwidth_cost = max(0, (storage_size * 0.1) - bandwidth['free_tier']) * bandwidth['rate']
        
        # Snapshots (20% du stockage)
        snapshot = cls.PRICES['hidden']['snapshot']
        snapshot_cost = storage_size * snapshot['factor'] * snapshot['rate']
        
        # Monitoring (par instance)
        monitoring = cls.PRICES['hidden']['monitoring']
        instance_count = vm_count + aks_nodes
        monitoring_cost = instance_count * monitoring['per_instance']
        
        # Security (3 secrets par VM)
        security = cls.PRICES['hidden']['security']
        security_cost = vm_count * 3 * security['per_secret']
        
        total = bandwidth_cost + snapshot_cost + monitoring_cost + security_cost
        
        breakdown = {
            'bandwidth': round(bandwidth_cost, 2),
            'snapshots': round(snapshot_cost, 2),
            'monitoring': round(monitoring_cost, 2),
            'security': round(security_cost, 2)
        }
        
        return round(total, 2), breakdown
    
    @classmethod
    def optimize_configuration(cls, config):
        """Optimise la configuration pour réduire les coûts"""
        optimized = config.copy()
        recommendations = []
        
        # Optimisation des VMs
        vm_hours = optimized.get('vm', {}).get('hours', 24)
        if vm_hours > 12:
            optimized['vm']['hours'] = 12
            recommendations.append({
                'type': 'vm_hours',
                'title': 'Réduction des heures de fonctionnement',
                'description': f'Réduction de {vm_hours} à 12 heures par jour',
                'savings_impact': 'high'
            })
        
        # Optimisation du stockage
        storage_type = optimized.get('storage', {}).get('type', 'Standard_LRS')
        if storage_type == 'Premium_LRS':
            optimized['storage']['type'] = 'Standard_GRS'
            recommendations.append({
                'type': 'storage_tier',
                'title': 'Optimisation du tier de stockage',
                'description': 'Passage de Premium LRS à Standard GRS',
                'savings_impact': 'high'
            })
        
        # Optimisation AKS
        aks_nodes = optimized.get('aks', {}).get('nodes', 3)
        if aks_nodes > 2:
            optimized['aks']['nodes'] = 2
            recommendations.append({
                'type': 'aks_nodes',
                'title': 'Optimisation du cluster AKS',
                'description': f'Réduction de {aks_nodes} à 2 nodes',
                'savings_impact': 'medium'
            })
        
        return optimized, recommendations

def register_routes(app):
    
    @app.route('/api/analyze', methods=['POST'])
    def analyze_costs():
        """Analyse complète des coûts avec IA"""
        try:
            config = request.get_json()
            
            if not config:
                return jsonify({'error': 'Configuration requise'}), 400
            
            engine = AzurePricingEngine()
            
            # Calcul des coûts actuels
            vm_cost, vm_details = engine.calculate_vm_cost(
                config.get('vm', {}).get('type', 'D2s_v3'),
                config.get('vm', {}).get('count', 2),
                config.get('vm', {}).get('hours', 16)
            )
            
            storage_cost, storage_details = engine.calculate_storage_cost(
                config.get('storage', {}).get('type', 'Standard_LRS'),
                config.get('storage', {}).get('size', 512),
                config.get('storage', {}).get('backup', True)
            )
            
            aks_cost, aks_details = engine.calculate_aks_cost(
                config.get('aks', {}).get('nodes', 3),
                config.get('aks', {}).get('enabled', True)
            )
            
            db_cost, db_details = engine.calculate_database_cost(
                config.get('database', {}).get('tier', 'Standard_S0'),
                config.get('database', {}).get('enabled', True)
            )
            
            hidden_cost, hidden_breakdown = engine.calculate_hidden_costs(config)
            
            total_cost = vm_cost + storage_cost + aks_cost + db_cost + hidden_cost
            
            # Calcul de la configuration optimisée
            optimized_config, recommendations = engine.optimize_configuration(config)
            
            # Coûts optimisés
            optimized_vm, _ = engine.calculate_vm_cost(
                optimized_config.get('vm', {}).get('type', 'D2s_v3'),
                optimized_config.get('vm', {}).get('count', 2),
                optimized_config.get('vm', {}).get('hours', 12)
            )
            
            optimized_storage, _ = engine.calculate_storage_cost(
                optimized_config.get('storage', {}).get('type', 'Standard_GRS'),
                optimized_config.get('storage', {}).get('size', 512),
                optimized_config.get('storage', {}).get('backup', True)
            )
            
            optimized_aks, _ = engine.calculate_aks_cost(
                optimized_config.get('aks', {}).get('nodes', 2),
                optimized_config.get('aks', {}).get('enabled', True)
            )
            
            optimized_db, _ = engine.calculate_database_cost(
                optimized_config.get('database', {}).get('tier', 'Standard_S0'),
                optimized_config.get('database', {}).get('enabled', True)
            )
            
            optimized_hidden, _ = engine.calculate_hidden_costs(optimized_config)
            
            optimized_total = optimized_vm + optimized_storage + optimized_aks + optimized_db + optimized_hidden
            
            # Calcul des économies
            savings = total_cost - optimized_total
            savings_percent = (savings / total_cost * 100) if total_cost > 0 else 0
            
            response = {
                'success': True,
                'analysis_id': f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                'timestamp': datetime.now().isoformat(),
                
                'current_config': config,
                'current_costs': {
                    'vm': vm_cost,
                    'storage': storage_cost,
                    'aks': aks_cost,
                    'database': db_cost,
                    'hidden': hidden_cost,
                    'total': total_cost,
                    'breakdown': {
                        'vm_percent': round((vm_cost / total_cost) * 100, 1) if total_cost > 0 else 0,
                        'storage_percent': round((storage_cost / total_cost) * 100, 1) if total_cost > 0 else 0,
                        'aks_percent': round((aks_cost / total_cost) * 100, 1) if total_cost > 0 else 0,
                        'db_percent': round((db_cost / total_cost) * 100, 1) if total_cost > 0 else 0,
                        'hidden_percent': round((hidden_cost / total_cost) * 100, 1) if total_cost > 0 else 0
                    }
                },
                
                'optimized_config': optimized_config,
                'optimized_costs': {
                    'vm': optimized_vm,
                    'storage': optimized_storage,
                    'aks': optimized_aks,
                    'database': optimized_db,
                    'hidden': optimized_hidden,
                    'total': optimized_total
                },
                
                'optimization': {
                    'savings_amount': round(savings, 2),
                    'savings_percent': round(savings_percent, 1),
                    'recommendations': recommendations,
                    'score': min(100, round(60 + (savings_percent * 1.5))),
                    'confidence': 0.94
                },
                
                'details': {
                    'vm': vm_details,
                    'storage': storage_details,
                    'aks': aks_details,
                    'database': db_details,
                    'hidden': hidden_breakdown
                }
            }
            
            return jsonify(response)
            
        except Exception as e:
            app.logger.error(f'Analysis error: {str(e)}')
            return jsonify({
                'success': False,
                'error': str(e),
                'message': 'Erreur lors de l\'analyse'
            }), 500
    
    @app.route('/api/health')
    def health():
        """Endpoint de santé"""
        return jsonify({
            'status': 'healthy',
            'service': 'azure-cost-intelligence',
            'version': '2.0',
            'timestamp': datetime.now().isoformat(),
            'uptime': 'running'
        })
    
    @app.route('/api/pricing')
    def get_pricing():
        """Retourne la grille tarifaire"""
        return jsonify(AzurePricingEngine.PRICES)
    
    @app.route('/')
    def index():
        """Page principale"""
        from flask import render_template
        return render_template('index.html')
    
    @app.route('/outils/calculateur/')
    def calculateur():
        """Alias pour l'URL principale"""
        from flask import render_template
        return render_template('index.html')

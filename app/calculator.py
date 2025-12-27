"""
Logique de calcul des coûts Azure
"""
from pricing import VM_PRICING, AKS_PRICING, STORAGE_PRICING, FUNCTIONS_PRICING, SQL_PRICING


def calculate_vm_cost(vm_size, quantity=1, hours_per_day=24, days_per_month=30):
    """Calcul coût VMs"""
    if vm_size not in VM_PRICING:
        return None
    
    vm = VM_PRICING[vm_size]
    hours_per_month = hours_per_day * days_per_month
    monthly_cost = vm['price_hour'] * hours_per_month * quantity
    yearly_cost = monthly_cost * 12
    
    return {
        'vm_size': vm_size,
        'quantity': quantity,
        'cpu': vm['cpu'] * quantity,
        'ram_gb': vm['ram'] * quantity,
        'hours_per_month': hours_per_month,
        'monthly_cost': round(monthly_cost, 2),
        'yearly_cost': round(yearly_cost, 2)
    }


def calculate_aks_cost(node_size, node_count=2, hours_per_day=24, days_per_month=30):
    """Calcul coût AKS Cluster"""
    if node_size not in AKS_PRICING['node_pools']:
        return None
    
    hours_per_month = hours_per_day * days_per_month
    
    # Coût management cluster
    cluster_cost = AKS_PRICING['cluster_management'] * hours_per_month
    
    # Coût nodes
    node = AKS_PRICING['node_pools'][node_size]
    nodes_cost = node['price_hour'] * hours_per_month * node_count
    
    total_monthly = cluster_cost + nodes_cost
    total_yearly = total_monthly * 12
    
    return {
        'node_size': node_size,
        'node_count': node_count,
        'cpu_total': node['cpu'] * node_count,
        'ram_total_gb': node['ram'] * node_count,
        'cluster_management_monthly': round(cluster_cost, 2),
        'nodes_monthly': round(nodes_cost, 2),
        'monthly_cost': round(total_monthly, 2),
        'yearly_cost': round(total_yearly, 2)
    }


def calculate_storage_cost(storage_type, size_gb):
    """Calcul coût Storage"""
    if storage_type not in STORAGE_PRICING:
        return None
    
    monthly_cost = STORAGE_PRICING[storage_type] * size_gb
    yearly_cost = monthly_cost * 12
    
    return {
        'storage_type': storage_type,
        'size_gb': size_gb,
        'monthly_cost': round(monthly_cost, 2),
        'yearly_cost': round(yearly_cost, 2)
    }


def calculate_functions_cost(plan_type, executions=0, gb_seconds=0, plan_tier='EP1'):
    """Calcul coût Azure Functions"""
    if plan_type == 'consumption':
        pricing = FUNCTIONS_PRICING['consumption']
        
        # Calcul avec déduction du gratuit
        billable_executions = max(0, executions - pricing['free_executions'])
        billable_gb_seconds = max(0, gb_seconds - pricing['free_gb_seconds'])
        
        exec_cost = billable_executions * pricing['execution_price']
        compute_cost = billable_gb_seconds * pricing['gb_second_price']
        monthly_cost = exec_cost + compute_cost
        
        return {
            'plan_type': 'Consumption',
            'executions': executions,
            'gb_seconds': gb_seconds,
            'monthly_cost': round(monthly_cost, 2),
            'yearly_cost': round(monthly_cost * 12, 2)
        }
    else:
        # Premium plan
        if plan_tier not in FUNCTIONS_PRICING['premium']:
            return None
        
        hours_per_month = 730  # moyenne
        monthly_cost = FUNCTIONS_PRICING['premium'][plan_tier] * hours_per_month
        
        return {
            'plan_type': f'Premium {plan_tier}',
            'monthly_cost': round(monthly_cost, 2),
            'yearly_cost': round(monthly_cost * 12, 2)
        }


def calculate_sql_cost(tier):
    """Calcul coût SQL Database"""
    if tier not in SQL_PRICING:
        return None
    
    monthly_cost = SQL_PRICING[tier]
    yearly_cost = monthly_cost * 12
    
    return {
        'tier': tier,
        'monthly_cost': round(monthly_cost, 2),
        'yearly_cost': round(yearly_cost, 2)
    }


def calculate_total(components):
    """Calcul du coût total de plusieurs composants"""
    total_monthly = sum(c.get('monthly_cost', 0) for c in components if c)
    total_yearly = sum(c.get('yearly_cost', 0) for c in components if c)
    
    return {
        'total_monthly': round(total_monthly, 2),
        'total_yearly': round(total_yearly, 2),
        'components': components
    }

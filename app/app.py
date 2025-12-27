"""
Azure Cost Calculator - Flask Application
"""
from flask import Flask, render_template, request, jsonify
import calculator

app = Flask(__name__)


@app.route('/')
def index():
    """Page principale du calculateur"""
    return render_template('index.html')


@app.route('/api/calculate/vm', methods=['POST'])
def calculate_vm():
    """API - Calcul coût VM"""
    data = request.get_json()
    result = calculator.calculate_vm_cost(
        vm_size=data.get('vm_size'),
        quantity=int(data.get('quantity', 1)),
        hours_per_day=int(data.get('hours_per_day', 24)),
        days_per_month=int(data.get('days_per_month', 30))
    )
    return jsonify(result)


@app.route('/api/calculate/aks', methods=['POST'])
def calculate_aks():
    """API - Calcul coût AKS"""
    data = request.get_json()
    result = calculator.calculate_aks_cost(
        node_size=data.get('node_size'),
        node_count=int(data.get('node_count', 2)),
        hours_per_day=int(data.get('hours_per_day', 24)),
        days_per_month=int(data.get('days_per_month', 30))
    )
    return jsonify(result)


@app.route('/api/calculate/storage', methods=['POST'])
def calculate_storage():
    """API - Calcul coût Storage"""
    data = request.get_json()
    result = calculator.calculate_storage_cost(
        storage_type=data.get('storage_type'),
        size_gb=int(data.get('size_gb', 100))
    )
    return jsonify(result)


@app.route('/api/calculate/functions', methods=['POST'])
def calculate_functions():
    """API - Calcul coût Functions"""
    data = request.get_json()
    result = calculator.calculate_functions_cost(
        plan_type=data.get('plan_type'),
        executions=int(data.get('executions', 0)),
        gb_seconds=int(data.get('gb_seconds', 0)),
        plan_tier=data.get('plan_tier', 'EP1')
    )
    return jsonify(result)


@app.route('/api/calculate/sql', methods=['POST'])
def calculate_sql():
    """API - Calcul coût SQL"""
    data = request.get_json()
    result = calculator.calculate_sql_cost(tier=data.get('tier'))
    return jsonify(result)


@app.route('/api/calculate/total', methods=['POST'])
def calculate_total():
    """API - Calcul total de tous les composants"""
    data = request.get_json()
    components = data.get('components', [])
    
    results = []
    for comp in components:
        comp_type = comp.get('type')
        
        if comp_type == 'vm':
            result = calculator.calculate_vm_cost(**comp.get('params'))
        elif comp_type == 'aks':
            result = calculator.calculate_aks_cost(**comp.get('params'))
        elif comp_type == 'storage':
            result = calculator.calculate_storage_cost(**comp.get('params'))
        elif comp_type == 'functions':
            result = calculator.calculate_functions_cost(**comp.get('params'))
        elif comp_type == 'sql':
            result = calculator.calculate_sql_cost(**comp.get('params'))
        else:
            continue
        
        if result:
            results.append(result)
    
    total = calculator.calculate_total(results)
    return jsonify(total)


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'azure-cost-calculator'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

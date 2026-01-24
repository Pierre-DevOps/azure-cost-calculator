PRICES = {
  "B2s": 0.05,
  "D2s": 0.10,
  "D4s": 0.20
}

def calculate(data):
    vm = PRICES[data["vm_size"]] * data["vm_qty"] * data["vm_hours"] * 30
    aks = PRICES[data["aks_size"]] * data["aks_nodes"] * data["aks_hours"] * 30
    storage = data["storage_gb"] * 0.02
    sql = 5 if data["sql_tier"] == "basic" else 30

    total = round(vm + aks + storage + sql, 2)
    hidden = round(total * 0.18, 2)
    optimized = round(total * 0.7, 2)

    projection = [
        round(optimized * 12, 2),
        round(optimized * 12 * 1.05, 2),
        round(optimized * 12 * 1.10, 2)
    ]

    return {
        "total": total,
        "hidden": hidden,
        "optimized": optimized,
        "savings": round(total - optimized, 2),
        "projection": projection
    }

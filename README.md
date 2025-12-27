#  Azure Cost Calculator

Calculateur de coûts Azure pour estimer rapidement vos dépenses d'infrastructure cloud.

##  Fonctionnalités

- **Machines Virtuelles** : Calcul coûts VM (B-series, D-series)
- **Azure Kubernetes Service** : Estimation cluster AKS + nodes
- **Stockage Azure** : Calcul Storage (LRS, GRS, Premium)
- **SQL Database** : Coûts bases de données (Basic, Standard, Premium)
- **Estimation totale** : Vue d'ensemble mensuelle et annuelle

##  Architecture

- **Backend** : Flask (Python 3.11)
- **Frontend** : HTML/CSS/JavaScript natif
- **Conteneurisation** : Docker
- **Orchestration** : Kubernetes (K3s)
- **CI/CD** : GitHub Actions → GHCR → ArgoCD
- **Déploiement** : GitOps avec Kustomize

##  Déploiement

### Local
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r app/requirements.txt
cd app && python app.py
```

Accès : http://localhost:5000

### Production (Kubernetes)

Déploiement automatique via ArgoCD :
```bash
kubectl apply -f manifests/overlays/prod/
```

Service exposé sur NodePort 30500.

##  Tarifs

Tarifs basés sur la région **West Europe** (à jour décembre 2024).

##  Accès

Production : https://pierre-devops.com/outils/calculateur

##  Auteur

**Pierre-DevOps** - Consultant DevOps Azure & Kubernetes

---

*Projet développé dans le cadre de Pierre-DevOps Solutions*

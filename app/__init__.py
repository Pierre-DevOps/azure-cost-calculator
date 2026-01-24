from flask import Flask, render_template
from .routes import register_routes

app = Flask(__name__)

# Enregistrement des routes
register_routes(app)

@app.route('/')
def index():
    """Page principale du calculateur"""
    return render_template('index.html')

@app.route('/outils/calculateur/')
def calculateur():
    """Alias pour l'URL principale"""
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)

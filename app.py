from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_socketio import SocketIO, emit
import stripe
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
import os
from dotenv import load_dotenv
load_dotenv()


app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///grocery.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key'  # Required for SocketIO
db = SQLAlchemy(app)
migrate = Migrate(app, db)
socketio = SocketIO(app, cors_allowed_origins="*")  # Initialize SocketIO

# Stripe configuration

YOUR_DOMAIN = 'http://localhost:5000'
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Email configuration
EMAIL_ADDRESS = 'your-email@gmail.com'
EMAIL_PASSWORD = 'your-app-password'
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 465

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    image = db.Column(db.String(200), nullable=False)

class Visitor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    page = db.Column(db.String(100), nullable=False)

def send_notification_email(ip_address, page):
    try:
        msg = MIMEText(f"New visitor to Grocery Store!\nIP: {ip_address}\nPage: {page}\nTime: {datetime.utcnow()}")
        msg['Subject'] = 'New Visitor Notification'
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = EMAIL_ADDRESS

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
    except Exception as e:
        print(f"Email notification failed: {e}")

@app.route('/')
def index():
    # Log visitor
    ip_address = request.remote_addr
    page = request.path
    visitor = Visitor(ip_address=ip_address, page=page)
    db.session.add(visitor)
    db.session.commit()

    # Send notification
    send_notification_email(ip_address, page)

    # Broadcast new visitor to connected clients
    socketio.emit('new_visitor', {
        'id': visitor.id,
        'ip_address': visitor.ip_address,
        'timestamp': visitor.timestamp.isoformat(),
        'page': visitor.page
    })

    return render_template('index.html')

@app.route('/api/products', methods=['GET'])
def get_products():
    products = Product.query.all()
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'description': p.description,
        'price': p.price,
        'category': p.category,
        'image': p.image
    } for p in products])

@app.route('/api/visitors', methods=['GET'])
def get_visitors():
    visitors = Visitor.query.order_by(Visitor.timestamp.desc()).all()
    return jsonify([{
        'id': v.id,
        'ip_address': v.ip_address,
        'timestamp': v.timestamp.isoformat(),
        'page': v.page
    } for v in visitors])

@app.route('/api/create-checkout-session', methods=['POST'])
def create_checkout_session():
    try:
        data = request.get_json()
        line_items = data['line_items']
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=YOUR_DOMAIN + '/success.html',
            cancel_url=YOUR_DOMAIN + '/',
        )
        return jsonify({'id': checkout_session.id})
    except Exception as e:
        return jsonify(error=str(e)), 403

@app.route('/api/newsletter', methods=['POST'])
def newsletter():
    email = request.json.get('email')
    # Save email to database or email service
    return jsonify({'message': 'Subscribed successfully'})

@app.route('/success.html')
def success():
    return render_template('success.html')

@app.route('/admin')
def admin_dashboard():
    visitors = Visitor.query.order_by(Visitor.timestamp.desc()).all()
    return render_template('admin.html', visitors=visitors)

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if not Product.query.first():
            products = [
                Product(name='Fresh Apples', description='Crisp, juicy apples sourced from local orchards.', price=2.99, category='Fruits', image='static/images/products/fresh-apples.jpg'),
                Product(name='Organic Spinach', description='Fresh, nutrient-rich spinach grown without pesticides.', price=3.49, category='Vegetables', image='static/images/products/organic-spinach.jpg'),
                Product(name='Whole Milk', description='Creamy, farm-fresh milk for your daily needs.', price=4.99, category='Dairy', image='static/images/products/whole-milk.jpg'),
                Product(name='Sourdough Bread', description='Artisan bread with a tangy flavor.', price=5.49, category='Bakery', image='static/images/products/sourdough-bread.jpg'),
                Product(name='Free-Range Eggs', description='Fresh eggs from free-range hens.', price=4.29, category='Dairy', image='static/images/products/free-range-eggs.jpg'),
                Product(name='Extra Virgin Olive Oil', description='Premium olive oil for cooking and dressings.', price=9.99, category='Pantry', image='static/images/products/olive-oil.jpg'),
            ]
            db.session.bulk_save_objects(products)
            db.session.commit()
    socketio.run(app, port=5000, debug=True)
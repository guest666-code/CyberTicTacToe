from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room
import random
import string

app = Flask(__name__)
app.config['SECRET_KEY'] = 'nexus-secret-key'
socketio = SocketIO(app, cors_allowed_origins="*")

# Odaların durumunu bellekte tutacağımız sözlük (RAM)
rooms = {}

def generate_room_code():
    """4 haneli rastgele büyük harf ve rakamlardan oluşan oda kodu üretir."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('create_room')
def handle_create_room():
    """Yeni oda oluşturur ve oluşturan oyuncuyu X sembolüyle odaya ekler."""
    room_code = generate_room_code()
    rooms[room_code] = {
        'board': [''] * 9,
        'turn': 'X',
        'players': [request.sid]
    }
    join_room(room_code)
    emit('room_created', {'room': room_code, 'symbol': 'X'})

@socketio.on('join_room')
def handle_join_room(data):
    """Mevcut bir odaya katılır ve katılan 2. oyuncuya O sembolünü atar."""
    room_code = data.get('room', '').upper()
    if room_code in rooms and len(rooms[room_code]['players']) < 2:
        rooms[room_code]['players'].append(request.sid)
        join_room(room_code)
        emit('game_start', {
            'room': room_code, 
            'symbol': 'O', 
            'board': rooms[room_code]['board'], 
            'turn': rooms[room_code]['turn']
        }, room=room_code)
    else:
        emit('error', {'message': 'Oda dolu veya bulunamadı!'})

@socketio.on('make_move')
def handle_make_move(data):
    """Oyuncunun yaptığı hamleyi doğrular ve tahtayı tüm odaya günceller."""
    room_code = data.get('room')
    index = data.get('index')
    symbol = data.get('symbol')
    
    if room_code in rooms:
        room = rooms[room_code]
        # Kare boşsa ve sıra hamleyi yapan oyuncudaysa
        if room['board'][index] == '' and room['turn'] == symbol:
            room['board'][index] = symbol
            room['turn'] = 'O' if symbol == 'X' else 'X'
            emit('update_board', {
                'board': room['board'], 
                'turn': room['turn']
            }, room=room_code)

if __name__ == '__main__':
    # host='0.0.0.0' sayesinde tablet üzerinden yerel ağdaki diğer cihazlar da bağlanabilir
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

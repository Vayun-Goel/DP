from flask import Flask, request, jsonify
from mtcnn import MTCNN
import cv2
import numpy as np
import base64

app = Flask(__name__)

@app.route('/upload', methods=['POST'])
def upload_image():
    try:
        image_base64 = request.json['image']
        image_buffer = np.frombuffer(base64.b64decode(image_base64), dtype=np.uint8)
        image = cv2.imdecode(image_buffer, flags=cv2.IMREAD_COLOR)

        detector = MTCNN()
        faces = detector.detect_faces(image)

        face_images = []
        for i, face in enumerate(faces):
            x, y, width, height = face['box']
            face_image = image[y:y+height, x:x+width]
            _, encoded_image = cv2.imencode('.jpg', face_image)
            encoded_image_base64 = base64.b64encode(encoded_image).decode('utf-8')
            face_images.append(encoded_image_base64)

        return jsonify({"face_images": face_images})
    except Exception as e:
        return str(e), 400

if __name__ == '__main__':
    app.run(debug=True)


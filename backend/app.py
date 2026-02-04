import os
import uuid

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from database import UPLOAD_ROOT, init_db, insert_upload

app = Flask(__name__)
CORS(app)

ALLOWED_EXTENSIONS = {".mp4", ".mov"}


init_db()


@app.post("/api/ingest")
def ingest():
    payload = request.get_json(silent=True) or {}
    problem = payload.get("problem", [])
    videos = payload.get("videos", [])

    if not isinstance(problem, list) or not isinstance(videos, list):
        return (
            jsonify(success=False, message="'problem' and 'videos' must be lists"),
            400,
        )

    return jsonify(success=True, message="ok")


@app.post("/api/upload")
def upload_video():
    if "file" not in request.files:
        return jsonify(success=False, message="Missing file"), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify(success=False, message="Empty filename"), 400

    filename = secure_filename(file.filename)
    _, ext = os.path.splitext(filename)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        return jsonify(success=False, message="Only .mp4 and .mov allowed"), 400

    upload_uuid = str(uuid.uuid4())
    upload_dir = os.path.join(UPLOAD_ROOT, upload_uuid)
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, filename)
    file.save(file_path)

    # Generate URL for the uploaded video
    video_url = f"/api/videos/{upload_uuid}/{filename}"

    insert_upload(upload_uuid, filename, file_path, video_url)

    return jsonify(success=True, message="ok", upload_uuid=upload_uuid, url=video_url)


@app.get("/api/videos/<upload_uuid>/<filename>")
def serve_video(upload_uuid, filename):
    """Serve uploaded video files"""
    upload_dir = os.path.join(UPLOAD_ROOT, upload_uuid)
    return send_from_directory(upload_dir, filename)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)

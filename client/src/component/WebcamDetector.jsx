import { useEffect, useRef, useState } from "react";

export default function WebcamDetector() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detections, setDetections] = useState([]);
  const latestDetections = useRef([]); // simpan deteksi terakhir

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      videoRef.current.srcObject = stream;
    });
  }, []);

  // Fungsi untuk draw video + bounding box tiap frame
  useEffect(() => {
    const draw = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const ctx = canvas.getContext("2d");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw bounding box dari deteksi terakhir
      latestDetections.current.forEach((person) => {
        const box = person.BoundingBox;
        if (box) {
          ctx.strokeStyle = "red";
          ctx.lineWidth = 2;
          ctx.strokeRect(
            box.Left * canvas.width,
            box.Top * canvas.height,
            box.Width * canvas.width,
            box.Height * canvas.height
          );
        }

        // PPE tiap body part
        person.BodyParts?.forEach((bp) => {
          if (bp.BoundingBox) {
            const b = bp.BoundingBox;
            ctx.strokeStyle = bp.EquipmentDetections?.length ? "green" : "red";
            ctx.lineWidth = 2;
            ctx.strokeRect(
              b.Left * canvas.width,
              b.Top * canvas.height,
              b.Width * canvas.width,
              b.Height * canvas.height
            );

            // label
            ctx.fillStyle = "yellow";
            ctx.font = "14px sans-serif";
            ctx.fillText(
              `${bp.Name}: ${bp.EquipmentDetections?.length ? "✅" : "❌"}`,
              b.Left * canvas.width,
              b.Top * canvas.height - 5
            );
          }
        });
      });

      requestAnimationFrame(draw);
    };

    draw();
  }, []);

  // Fungsi untuk deteksi PPE tiap 0.5 detik
  useEffect(() => {
    const interval = setInterval(async () => {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = 320; // resize untuk cepat
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageBase64 = canvas
        .toDataURL("image/jpeg")
        .replace(/^data:image\/jpeg;base64,/, "");

      try {
        const res = await fetch("http://localhost:4000/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64 }),
        });
        const data = await res.json();
        latestDetections.current = data.Persons || [];
        setDetections(data.Persons || []);
      } catch (err) {
        console.error("Detection error:", err);
      }
    }, 500); // tiap 0.5 detik

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center p-6">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        src="http://172.16.32.108:8080/" // ganti sesuai IP Webcam
        style={{ display: "none" }}
      />

      <canvas
        ref={canvasRef}
        className="rounded-xl shadow-md"
        style={{ width: "640px", height: "480px" }}
      />
      <div className="mt-4 bg-gray-100 p-3 rounded-md w-80">
        <h3 className="font-semibold text-lg mb-2">Deteksi PPE:</h3>
        {detections.length === 0 ? (
          <p>Tidak ada orang terdeteksi...</p>
        ) : (
          detections.map((person, i) => (
            <div key={i} className="mb-2">
              👷 Person #{i + 1}:
              {person.BodyParts.map((bp, j) => (
                <p key={j}>
                  • {bp.Name}:{" "}
                  {bp.EquipmentDetections?.length
                    ? "✅ Terlindungi"
                    : "❌ Tidak Terlindungi"}
                </p>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

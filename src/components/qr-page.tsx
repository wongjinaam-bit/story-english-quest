"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QRPage() {
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState("");

  useEffect(() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    setUrl(appUrl);
    QRCode.toDataURL(appUrl, { margin: 2, width: 220 }).then(setQr).catch(() => setQr(""));
  }, []);

  return (
    <main className="main">
      <section className="hero">
        <div>
          <p className="eyebrow">Share App</p>
          <h3>掃 QR Code 打開英文故事 App</h3>
          <p>部署到 Vercel 後，把正式網址設定到 NEXT_PUBLIC_APP_URL，這裡就會產生可分享的 QR Code。</p>
          <div className="btns">
            <a className="btn primary" href="/">回學生端</a>
            <a className="btn secondary" href="/admin">教師後台</a>
          </div>
        </div>
        <div className="qr-box">
          {qr ? <img src={qr} alt="Story English Quest QR Code" width={220} height={220} /> : <p>QR Code 產生中</p>}
        </div>
      </section>
      <article className="panel" style={{ marginTop: 18 }}>
        <h3>目前網址</h3>
        <p className="muted">{url}</p>
      </article>
    </main>
  );
}

// SFU runtime config — all overridable via environment variables.
module.exports = {
  listenPort: Number(process.env.SFU_PORT || 4000),

  // Public IP the SFU announces in ICE candidates. MUST be the server's public
  // IPv4 in production (behind NAT/cloud). Falls back to 127.0.0.1 for local dev.
  announcedIp: process.env.ANNOUNCED_IP || null,

  // RTP/RTCP UDP+TCP port range mediasoup uses for media. Open these on the
  // host firewall (UDP and TCP).
  rtcMinPort: Number(process.env.RTC_MIN_PORT || 40000),
  rtcMaxPort: Number(process.env.RTC_MAX_PORT || 40100),

  // How many mediasoup Workers (≈ 1 per CPU core).
  numWorkers: Number(process.env.NUM_WORKERS || Math.max(1, require('os').cpus().length)),

  // Codecs the router supports. Opus for audio, VP8 + H264 for video/screen.
  mediaCodecs: [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: { 'x-google-start-bitrate': 1000 },
    },
    {
      kind: 'video',
      mimeType: 'video/H264',
      clockRate: 90000,
      parameters: {
        'packetization-mode': 1,
        'profile-level-id': '42e01f',
        'level-asymmetry-allowed': 1,
        'x-google-start-bitrate': 1000,
      },
    },
  ],

  worker: {
    logLevel: process.env.MS_LOG_LEVEL || 'warn',
    rtcMinPort: Number(process.env.RTC_MIN_PORT || 40000),
    rtcMaxPort: Number(process.env.RTC_MAX_PORT || 40100),
  },
};

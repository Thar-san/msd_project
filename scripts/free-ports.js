const { execSync } = require('child_process');

const ports = [5000, 5173];

function freePort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const lines = output.trim().split('\n');
      const pids = new Set();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        // Format: TCP    0.0.0.0:5000    0.0.0.0:0    LISTENING    1234
        if (parts.length >= 5 && parts[1].endsWith(`:${port}`) && parts[3] === 'LISTENING') {
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && pid !== String(process.pid)) {
            pids.add(pid);
          }
        }
      }

      for (const pid of pids) {
        try {
          process.kill(Number(pid));
          console.log(`[free-ports] Freed port ${port} by terminating PID ${pid}`);
        } catch (e) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            console.log(`[free-ports] Force killed PID ${pid} on port ${port}`);
          } catch (_) {}
        }
      }
    } else {
      const pid = execSync(`lsof -ti :${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      if (pid) {
        pid.split('\n').forEach((p) => {
          try {
            process.kill(Number(p.trim()));
            console.log(`[free-ports] Freed port ${port} by terminating PID ${p}`);
          } catch (_) {}
        });
      }
    }
  } catch (err) {
    // Port is not in use or netstat didn't find matches - ignore
  }
}

for (const port of ports) {
  freePort(port);
}

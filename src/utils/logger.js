const vscode = require('vscode');

class Logger {
  constructor() {
    this.outputChannel = null;
  }

  getOutputChannel() {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel('ttt-eye');
    }
    return this.outputChannel;
  }

  getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  log(message, ...args) {
    const channel = this.getOutputChannel();
    const timestamp = this.getTimestamp();
    const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
    channel.appendLine(`[${timestamp}] [INFO] ${formattedMessage}${args.length > 0 ? ' ' + JSON.stringify(args) : ''}`);
  }

  error(message, ...args) {
    const channel = this.getOutputChannel();
    const timestamp = this.getTimestamp();
    const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
    channel.appendLine(`[${timestamp}] [ERROR] ${formattedMessage}${args.length > 0 ? ' ' + JSON.stringify(args) : ''}`);
  }

  warn(message, ...args) {
    const channel = this.getOutputChannel();
    const timestamp = this.getTimestamp();
    const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
    channel.appendLine(`[${timestamp}] [WARN] ${formattedMessage}${args.length > 0 ? ' ' + JSON.stringify(args) : ''}`);
  }

  info(message, ...args) {
    this.log(message, ...args);
  }
}

module.exports = new Logger();

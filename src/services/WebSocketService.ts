import { ClientWsMessage, ServerWsMessage } from '../types/WebSocketMessages'

interface WebSocketServiceHandlers {
  onOpen: () => void
  onMessage: (message: ServerWsMessage) => void
  onError: (event: Event) => void
  onClose: (event: CloseEvent) => void
}

class WebSocketService {
  private ws: WebSocket | null = null
  private currentSessionId: string | null = null
  private handlers: WebSocketServiceHandlers | null = null
  private wsUrlBase: string

  constructor() {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || ''
    this.wsUrlBase = `${wsUrl}/evaluator/ws/analysis/`
  }

  public connect(sessionId: string, handlers: WebSocketServiceHandlers): void {
    if (
      this.ws &&
      this.ws.readyState === WebSocket.OPEN &&
      this.currentSessionId === sessionId
    ) {
      console.debug('WebSocketService: Already connected to session:', sessionId)
      if (this.handlers?.onOpen) {
        this.handlers.onOpen()
      }
      return
    }

    if (this.ws) {
      this.disconnect()
    }

    this.currentSessionId = sessionId
    this.handlers = handlers
    const fullWsUrl = `${this.wsUrlBase}${sessionId}`
    this.ws = new WebSocket(fullWsUrl)

    this.ws.onopen = () => {
      console.debug(
        'WebSocketService: Connection established for session:',
        this.currentSessionId
      )
      if (this.handlers?.onOpen) {
        this.handlers.onOpen()
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const serverMessage: ServerWsMessage = JSON.parse(event.data as string)
        if (this.handlers?.onMessage) {
          this.handlers.onMessage(serverMessage)
        }
      } catch (e) {
        console.error(
          'WebSocketService: Error parsing server message or handling it:',
          e
        )
        // Optionally, call onError handler with a custom error event/object
      }
    }

    this.ws.onerror = (event: Event) => {
      console.error('WebSocketService: Error:', event)
      if (this.handlers?.onError) {
        this.handlers.onError(event)
      }
    }

    this.ws.onclose = (event: CloseEvent) => {
      console.debug(
        'WebSocketService: Connection closed:',
        event.code,
        event.reason
      )
      if (this.handlers?.onClose) {
        this.handlers.onClose(event)
      }

      if (this.currentSessionId === sessionId) {
        this.ws = null
        this.currentSessionId = null

      }
    }
  }

  public disconnect(): void {
    if (this.ws) {
      console.debug(
        'WebSocketService: Disconnecting session:',
        this.currentSessionId
      )
      this.ws.close()
      this.ws = null
      this.currentSessionId = null
    }
  }

  public sendMessage(message: ClientWsMessage): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.debug('WebSocketService: Sending message:', message)
      this.ws.send(JSON.stringify(message))
      return true
    } else {
      console.error(
        'WebSocketService: Cannot send message, WebSocket is not connected or not open.'
      )
      return false
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  public getCurrentSessionId(): string | null {
    return this.currentSessionId
  }
}

const webSocketServiceInstance = new WebSocketService()
export default webSocketServiceInstance

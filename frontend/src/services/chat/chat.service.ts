import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { MessageModel } from '../../models/message-model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private ws!: WebSocket;
  private WSBaseUrl = 'ws://localhost:8000/ws/chat'; // ✅ backend WebSocket URL
  private HTTPBaseUrl = 'http://localhost:8000';
  public messages: Subject<MessageModel> = new Subject<MessageModel>();

  constructor(private httpClient:HttpClient) {
    
  }

  // Connect to backend WebSocket
  connect(userName: string) {
    const socketUrl = `${this.WSBaseUrl}/${userName}`;
    this.ws = new WebSocket(socketUrl);

    // When message is received
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data); // ✅ parse incoming JSON
      this.messages.next(data); // push message to subscribers
    };

    this.ws.onopen = () => {
      console.log(`[Connected] WebSocket opened for user: ${userName}`);
    };

    this.ws.onclose = () => {
      console.log(`[Disconnected] WebSocket closed for user: ${userName}`);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  // Send a message to the backend
  sendMessage(message: MessageModel) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message)); // ✅ send JSON
    } else {
      console.warn('WebSocket is not connected.');
    }
  }

  // Optional: Close connection manually
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  getUserList(userName:string){
    return this.httpClient.get<string[]>(`${this.HTTPBaseUrl}/get_users/${userName}`)
  }
}

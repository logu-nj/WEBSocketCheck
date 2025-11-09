import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { ChatService } from '../../services/chat/chat.service';
import { MessageModel } from '../../models/message-model';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss'],
  standalone: false,
})
export class ChatComponent implements OnInit {
  chatMessages: MessageModel[] = [];
  tabMessages: MessageModel[] = [];
  tabNames: string[] = [];
  tabName = '';
  userName = '';
  message = '';

  constructor(
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    // Prompt username
    this.userName = prompt('Please enter your username:') ?? '';
    if (!this.userName.trim()) {
      alert('Username required');
      this.ngOnInit();
      return;
    }

    // Connect WebSocket
    this.chatService.connect(this.userName);

    // Load available chat tabs (user list)
    this.getTabNames();

    // Subscribe to incoming messages
    this.chatService.messages.subscribe((msg: any) => {
      this.zone.run(() => { // 👈 Ensures UI update in Angular zone
        const parsedMsg: MessageModel =
          typeof msg === 'string' ? JSON.parse(msg) : msg;

        // Only process messages involving this user
        if (
          this.userName === parsedMsg.toUser ||
          this.userName === parsedMsg.fromUser
        ) {
          // Always create a new array reference to trigger change detection
          this.chatMessages = [...this.chatMessages, parsedMsg];
          this.updateTabMessages();
          this.cdr.detectChanges(); // 👈 Extra safety for async WebSocket
        }
      });
    });
  }

  /** Fetch user list for chat tabs */
  getTabNames(): void {
    this.chatService.getUserList(this.userName).subscribe((users) => {
      this.tabNames = [...users];
      if (users.length > 0) {
        this.selectTab(users[0]);
      }
    });
  }

  /** Select a chat tab */
  selectTab(tab: string): void {
    this.tabName = tab;
    this.updateTabMessages();
  }

  /** Update filtered chat messages for the selected tab */
  private updateTabMessages(): void {
    if (!this.tabName) return;
    this.tabMessages = this.chatMessages
      .filter(
        (msg) =>
          (msg.fromUser === this.userName && msg.toUser === this.tabName) ||
          (msg.fromUser === this.tabName && msg.toUser === this.userName)
      )
      .sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      );

    // Refresh UI manually (optional)
    this.cdr.detectChanges();
  }

  /** Send a message to the selected user */
  send(): void {
    if (!this.message.trim() || !this.tabName) return;

    const newMsg: MessageModel = {
      message: this.message,
      fromUser: this.userName,
      toUser: this.tabName,
      type: 0, // MESSAGE type
      time: new Date().toISOString(),
    };

    this.chatService.sendMessage(newMsg);

    // Add to local chat instantly
    this.chatMessages = [...this.chatMessages, newMsg];
    this.updateTabMessages();
    this.message = '';
  }
}

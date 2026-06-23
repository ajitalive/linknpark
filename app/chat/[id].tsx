import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE as API_URL } from '../../hooks/usePushNotifications';

type ChatMessage = { id: string; sender_type: string; content: string; created_at: string };

export default function ChatScreen() {
  const { id, visitor } = useLocalSearchParams<{ id: string, visitor?: string }>(); // incident_id
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isVisitor = visitor === 'true';

  useEffect(() => {
    async function initChat() {
      try {
        let authRole = 'owner';
        let authToken = '';
        let activeSessionId = null;

        if (isVisitor) {
          authRole = 'visitor';
          let visitorToken = await SecureStore.getItemAsync('lnp_visitor_token');
          if (!visitorToken) {
            visitorToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
            await SecureStore.setItemAsync('lnp_visitor_token', visitorToken);
          }
          authToken = visitorToken;

          const res = await fetch(`${API_URL}/api/chat/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ incident_id: id, visitor_token: authToken })
          });
          const data = await res.json();
          if (!res.ok || !data.session) throw new Error(data.error || 'Failed to initialize chat');
          activeSessionId = data.session?.id;
        } else {
          authToken = await SecureStore.getItemAsync('lnp_jwt') || '';
          if (!authToken) throw new Error('You are not logged in');

          const res = await fetch(`${API_URL}/api/incidents/${id}/chat`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          const data = await res.json();
          if (!res.ok || !data.session) throw new Error(data.error || 'Failed to initialize chat');
          activeSessionId = data.session.id;
        }
        
        if (!activeSessionId) throw new Error('No session ID returned');
        setSessionId(activeSessionId);

        // Fetch history
        const histRes = await fetch(`${API_URL}/api/chat/${activeSessionId}/messages`);
        const histData = await histRes.json();
        if (histData.messages) {
          setMessages(histData.messages);
        }

        // Connect WebSocket
        const wsUrl = API_URL?.replace('http', 'ws');
        const socket = new WebSocket(`${wsUrl}?session_id=${activeSessionId}&role=${authRole}&token=${authToken}`);
        
        socket.onopen = () => {
          socket.send(JSON.stringify({ type: 'auth' }));
        };

        socket.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          if (msg.type === 'message') {
            setMessages(prev => [...prev, {
              id: Math.random().toString(),
              sender_type: msg.sender_type,
              content: msg.content,
              created_at: msg.created_at
            }]);
          }
        };

        setWs(socket);
      } catch (e: any) {
        console.error('Chat init error', e);
        Alert.alert('Connection Error', e.message || 'Could not connect to chat. Please try again.');
      }
    }
    
    initChat();
    
    return () => {
      if (ws) ws.close();
    };
  }, [id, isVisitor]);

  function handleSend() {
    if (!text.trim()) return;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      Alert.alert('Disconnected', 'The chat connection was lost. Please go back and reopen the chat.');
      return;
    }
    
    const msg = text.trim();
    setText('');
    
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      sender_type: isVisitor ? 'visitor' : 'owner',
      content: msg,
      created_at: new Date().toISOString()
    }]);

    ws.send(JSON.stringify({ type: 'message', content: msg }));
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        {/* Header matching 'Car Connect' design */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={{ marginRight: 10 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.avatar}>
            <Ionicons name="person" size={20} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>{isVisitor ? 'Owner' : 'Visitor'}</Text>
          <View style={{ flex: 1 }} />
          <Ionicons name="call" size={20} color="#fff" style={{ marginHorizontal: 12 }} />
          <Ionicons name="videocam" size={22} color="#fff" style={{ marginHorizontal: 12 }} />
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </View>

        {/* Registration Bar */}
        <View style={styles.registrationBar}>
          <Text style={styles.registrationText}>@Incident {id.substring(0,6)}</Text>
        </View>

        {/* Messages List */}
        <ScrollView 
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.scrollContent}
        >
          {messages.map(msg => {
            const isMe = msg.sender_type === (isVisitor ? 'visitor' : 'owner');
            return (
              <View key={msg.id} style={[styles.bubbleWrap, isMe ? styles.bubbleWrapRight : styles.bubbleWrapLeft]}>
                <View style={[styles.bubble, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                  <Text style={isMe ? styles.bubbleTextRight : styles.bubbleTextLeft}>
                    {msg.content}
                  </Text>
                </View>
                <View style={[styles.timeRow, isMe ? { justifyContent: 'flex-end' } : {}]}>
                  <Text style={styles.timeText}>Today</Text>
                  <Text style={styles.timeText}>{formatTime(msg.created_at)}</Text>
                </View>
              </View>
            );
          })}
          {!sessionId && (
            <Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 40 }}>Waiting for visitor to connect...</Text>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputArea}>
          <TextInput
            style={styles.input}
            placeholder="Type here...."
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={setText}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#15803D' },
  root: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    backgroundColor: '#15803D',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12
  },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registrationBar: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  registrationText: { color: '#4B5563', fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 30 },
  bubbleWrap: { maxWidth: '80%', marginBottom: 16 },
  bubbleWrapLeft: { alignSelf: 'flex-start' },
  bubbleWrapRight: { alignSelf: 'flex-end' },
  bubble: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20,
  },
  bubbleLeft: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    backgroundColor: '#A7F3D0',
    borderBottomRightRadius: 4,
  },
  bubbleTextLeft: { color: '#1F2937', fontSize: 15, fontWeight: '500' },
  bubbleTextRight: { color: '#064E3B', fontSize: 15, fontWeight: '500' },
  timeRow: {
    flexDirection: 'row', gap: 12,
    marginTop: 4, paddingHorizontal: 4
  },
  timeText: { color: '#9CA3AF', fontSize: 10 },
  inputArea: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, paddingBottom: 24,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6'
  },
  input: {
    flex: 1, backgroundColor: '#F3F4F6',
    borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 15, color: '#1F2937'
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#15803D',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12
  }
});

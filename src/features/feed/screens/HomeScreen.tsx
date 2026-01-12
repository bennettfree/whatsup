import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, iconColors } from '@/components/Icon';

type MessageParticipant = {
  id: string;
  name: string;
  isMe?: boolean;
};

type MessagePlan = {
  id: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
};

type Message = {
  id: string;
  text: string;
  senderId: string;
  time: string;
  showTimestamp?: boolean;
};

type Conversation = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread?: boolean;
  isGroup?: boolean;
  members: MessageParticipant[];
  plan?: MessagePlan;
  messages: Message[];
};

type ViewMode = 'inbox' | 'chat' | 'details';

const mockConversations: Conversation[] = [
  {
    id: '1',
    name: 'John Miller',
    lastMessage: "Sure, let's go tomorrow",
    time: '4:32 PM',
    unread: true,
    isGroup: false,
    members: [
      { id: 'me', name: 'You', isMe: true },
      { id: 'john', name: 'John Miller' },
    ],
    plan: {
      id: 'plan-1',
      title: "Tony's Pizza — Tonight at 7",
      subtitle: 'View • Save',
      ctaPrimary: 'View',
      ctaSecondary: 'Save',
    },
    messages: [
      {
        id: 'm1',
        text: 'Hey, are we still on for tonight?',
        senderId: 'me',
        time: '4:20 PM',
      },
      {
        id: 'm2',
        text: "Sure, let's go tomorrow",
        senderId: 'john',
        time: '4:32 PM',
        showTimestamp: true,
      },
    ],
  },
  {
    id: '2',
    name: "Friday Night Crew",
    lastMessage: 'I can grab the table.',
    time: '3:05 PM',
    unread: false,
    isGroup: true,
    members: [
      { id: 'me', name: 'You', isMe: true },
      { id: 'sarah', name: 'Sarah' },
      { id: 'maria', name: 'Maria' },
      { id: 'liam', name: 'Liam' },
      { id: 'amir', name: 'Amir' },
    ],
    messages: [
      {
        id: 'g1',
        text: 'Who is in for tonight?',
        senderId: 'me',
        time: '2:48 PM',
      },
      {
        id: 'g2',
        text: 'I can grab the table.',
        senderId: 'sarah',
        time: '3:05 PM',
        showTimestamp: true,
      },
    ],
  },
  {
    id: '3',
    name: 'Jamie',
    lastMessage: 'Say hi 👋',
    time: 'Yesterday',
    unread: false,
    isGroup: false,
    members: [
      { id: 'me', name: 'You', isMe: true },
      { id: 'jamie', name: 'Jamie' },
    ],
    messages: [],
  },
];

const getInitials = (name: string) => {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
};

const getSubtitle = (conversation: Conversation) => {
  if (conversation.isGroup) {
    const count = conversation.members.length;
    return `${count} ${count === 1 ? 'member' : 'members'}`;
  }
  // For now keep this quiet and familiar
  return '';
};

export const HomeScreen = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState('');

  const selectedConversation = useMemo(
    () => mockConversations.find((c) => c.id === selectedId) ?? null,
    [selectedId],
  );

  const handleOpenConversation = (conversation: Conversation) => {
    setSelectedId(conversation.id);
    setViewMode('chat');
  };

  const handleBack = () => {
    if (viewMode === 'chat' || viewMode === 'details') {
      setViewMode('inbox');
      setSelectedId(null);
      setDraftMessage('');
    }
  };

  const handleOpenDetails = () => {
    if (selectedConversation) {
      setViewMode('details');
    }
  };

  const renderHeader = () => {
    if (viewMode === 'inbox') {
      return (
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
          <View className="flex-1 items-center">
            <Text className="text-base font-semibold text-gray-900">Messages</Text>
          </View>
          <TouchableOpacity className="absolute right-4">
            <Icon name="plus" size={20} color={iconColors.active} />
          </TouchableOpacity>
        </View>
      );
    }

    if (!selectedConversation) return null;

    const subtitle = getSubtitle(selectedConversation);

    return (
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={handleBack} className="pr-3">
            <Icon name="chevron-left" size={24} color={iconColors.active} />
          </TouchableOpacity>
          <View>
            <Text className="text-base font-semibold text-gray-900">
              {selectedConversation.name}
            </Text>
            {subtitle ? (
              <Text className="text-xs text-gray-400 mt-0.5">{subtitle}</Text>
            ) : null}
          </View>
        </View>
        {viewMode === 'chat' && (
          <TouchableOpacity onPress={handleOpenDetails}>
            <Icon name="info" size={20} color={iconColors.active} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderPlanBar = () => {
    if (viewMode !== 'chat' || !selectedConversation?.plan) return null;

    const { title, subtitle, ctaPrimary, ctaSecondary } = selectedConversation.plan;

    return (
      <View className="border-b border-gray-100 bg-white px-4 py-2">
        <View className="h-px bg-gray-100 mb-2" />
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-xs text-gray-500 mb-0.5">This chat has a plan</Text>
            <Text className="text-sm text-gray-900" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">{subtitle}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity className="px-3 py-1 rounded-full border border-gray-200">
              <Text className="text-xs text-gray-700">{ctaPrimary}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-3 py-1 rounded-full border border-gray-200">
              <Text className="text-xs text-gray-700">{ctaSecondary}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View className="h-px bg-gray-100 mt-2" />
      </View>
    );
  };

  const renderInboxRow = ({ item }: { item: Conversation }) => {
    const initials = getInitials(item.name);

    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white"
        onPress={() => handleOpenConversation(item)}
        activeOpacity={0.8}
      >
        {/* Avatar */}
        <View className="w-11 h-11 rounded-full bg-gray-100 items-center justify-center mr-3">
          {item.isGroup ? (
            <View className="flex-row -space-x-2">
              <View className="w-6 h-6 rounded-full bg-gray-200 items-center justify-center">
                <Text className="text-[10px] font-semibold text-gray-700">
                  {getInitials(item.members[1]?.name ?? '')}
                </Text>
              </View>
              <View className="w-6 h-6 rounded-full bg-gray-300 items-center justify-center">
                <Text className="text-[10px] font-semibold text-gray-800">
                  {getInitials(item.members[2]?.name ?? '')}
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-xs font-semibold text-gray-800">{initials}</Text>
          )}
        </View>

        {/* Text content */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-0.5">
            <Text
              className={`text-sm ${
                item.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'
              }`}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text className="ml-2 text-[11px] text-gray-400">{item.time}</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-xs text-gray-500 flex-1 ${item.unread ? 'font-medium' : ''}`}
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
            {item.unread && (
              <View className="ml-2 w-2 h-2 rounded-full bg-gray-900" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessageBubble = (message: Message, isFirstForSender: boolean) => {
    if (!selectedConversation) return null;

    const isMe = selectedConversation.members.find((m) => m.id === message.senderId)?.isMe;
    const senderName =
      selectedConversation.members.find((m) => m.id === message.senderId)?.name ?? '';

    const alignmentClass = isMe ? 'items-end' : 'items-start';
    const bubbleBgClass = isMe ? 'bg-gray-900' : 'bg-gray-100';
    const textColorClass = isMe ? 'text-white' : 'text-gray-900';

    return (
      <View key={message.id} className={`mb-2 px-4 ${alignmentClass}`}>
        {!isMe && isFirstForSender && selectedConversation.isGroup && (
          <Text className="text-[11px] text-gray-400 mb-1">{senderName}</Text>
        )}
        <View className={`max-w-[80%] rounded-2xl px-3 py-2 ${bubbleBgClass}`}>
          <Text className={`text-sm ${textColorClass}`}>{message.text}</Text>
        </View>
        {message.showTimestamp && (
          <Text className="text-[10px] text-gray-400 mt-1">{message.time}</Text>
        )}
      </View>
    );
  };

  const renderMessages = () => {
    if (!selectedConversation) return null;

    if (!selectedConversation.messages.length) {
      return (
        <View className="flex-1 items-center justify-center px-8 bg-gray-50">
          <Text className="text-sm text-gray-400 text-center">
            Say hi
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        className="flex-1 bg-gray-50"
        contentContainerStyle={{ paddingVertical: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {selectedConversation.messages.map((message, index, all) => {
          const prev = all[index - 1];
          const isFirstForSender = !prev || prev.senderId !== message.senderId;
          return renderMessageBubble(message, isFirstForSender);
        })}
      </ScrollView>
    );
  };

  const renderTypingIndicator = () => {
    if (viewMode !== 'chat' || !selectedConversation) return null;

    // Keep this subtle and always-on for now (purely visual)
    return (
      <View className="px-4 py-2 bg-gray-50">
        <View className="inline-flex items-center rounded-full bg-white px-3 py-1 border border-gray-100 self-start">
          <View className="flex-row items-center">
            <View className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1" />
            <View className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1" />
            <View className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          </View>
        </View>
      </View>
    );
  };

  const renderInputBar = () => {
    if (viewMode !== 'chat' || !selectedConversation) return null;

    return (
      <SafeAreaView
        edges={['bottom']}
        className="border-t border-gray-100 bg-white px-4 py-2"
      >
        <View className="flex-row items-center rounded-full bg-gray-50 px-3 py-2">
          <TouchableOpacity className="mr-3">
            <Icon name="plus" size={18} color={iconColors.default} />
          </TouchableOpacity>
          <TextInput
            value={draftMessage}
            onChangeText={setDraftMessage}
            placeholder="Message..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 text-sm text-gray-900"
            multiline={false}
          />
          <TouchableOpacity className="ml-3">
            <Icon name="send" size={18} color={iconColors.active} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

  const renderDetails = () => {
    if (viewMode !== 'details' || !selectedConversation) return null;

    const isGroup = !!selectedConversation.isGroup;

    return (
      <View className="flex-1 bg-white">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Chat name */}
          <View className="px-4 mb-6">
            <Text className="text-xs text-gray-400 mb-1">Chat name</Text>
            <Text className="text-base font-semibold text-gray-900">
              {selectedConversation.name}
            </Text>
          </View>

          {/* Members */}
          <View className="mb-6">
            <Text className="px-4 text-xs text-gray-400 mb-2">Members</Text>
            {selectedConversation.members.map((member) => (
              <TouchableOpacity
                key={member.id}
                className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white"
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3">
                    <Text className="text-[11px] font-semibold text-gray-800">
                      {getInitials(member.name)}
                    </Text>
                  </View>
                  <Text className="text-sm text-gray-900">
                    {member.isMe ? 'You' : member.name}
                  </Text>
                </View>
                <Icon name="chevron-right" size={18} color={iconColors.default} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View className="mt-2">
            <Text className="px-4 text-xs text-gray-400 mb-2">Settings</Text>
            <TouchableOpacity className="px-4 py-3 border-b border-gray-100 bg-white">
              <Text className="text-sm text-gray-900">Mute</Text>
            </TouchableOpacity>
            {isGroup && (
              <TouchableOpacity className="px-4 py-3 border-b border-gray-100 bg-white">
                <Text className="text-sm text-gray-900">Leave group</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity className="px-4 py-3 border-b border-gray-100 bg-white">
              <Text className="text-sm text-gray-900">Report</Text>
            </TouchableOpacity>
            <TouchableOpacity className="px-4 py-3 border-b border-gray-100 bg-white">
              <Text className="text-sm text-gray-900">
                {isGroup ? 'Block group' : 'Block'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderContent = () => {
    if (viewMode === 'inbox') {
      return (
        <View className="flex-1 bg-gray-50">
          <FlatList
            data={mockConversations}
            keyExtractor={(item) => item.id}
            renderItem={renderInboxRow}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </View>
      );
    }

    if (viewMode === 'chat') {
      return (
        <View className="flex-1 bg-gray-50">
          {renderPlanBar()}
          {renderMessages()}
          {renderTypingIndicator()}
          {renderInputBar()}
        </View>
      );
    }

    if (viewMode === 'details') {
      return renderDetails();
    }

    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {renderHeader()}
      {renderContent()}
    </SafeAreaView>
  );
};

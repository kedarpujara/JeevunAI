# 🎙️ Jeevun - Voice-First Journaling App

A beautiful, privacy-first journaling app that makes capturing your thoughts effortless through voice recording, AI analysis, and rich media attachments.

![App Screenshots](https://via.placeholder.com/800x400/007AFF/FFFFFF?text=Jeevun+Screenshots)

## ✨ Features

### 🎯 **Core Functionality**
- **Voice-First Recording** - Tap to record, automatic transcription via OpenAI Whisper
- **AI-Powered Analysis** - Smart title generation, mood detection, and contextual tagging
- **Rich Media Support** - Photos, location data, and expandable attachment system
- **Beautiful UI** - Apple-esque design with smooth animations and intuitive navigation

### 🔒 **Privacy & Security**
- **Local Storage** - All data stored locally with SQLite
- **Optional Cloud Sync** - Supabase integration with encryption boundaries planned
- **No Tracking** - Your thoughts stay private

### 🤖 **AI Intelligence**
- **Smart Titles** - Automatically generates meaningful entry titles
- **Contextual Tags** - AI analyzes content for emotions, activities, themes
- **Mood Tracking** - Visual mood picker with sentiment analysis
- **Location Context** - Rich location data with place recognition

### 📱 **User Experience**
- **One-Tap Recording** - Beautiful floating record button
- **Bottom Sheet Editor** - Seamless editing experience
- **Photo Integration** - Camera and gallery support with thumbnails
- **Date Override** - Backdate entries for past memories
- **Search & History** - Organized timeline view with filtering

## 🛠️ Technical Stack

### **Frontend**
- **React Native** with Expo Router
- **TypeScript** for type safety
- **React Native Reanimated** for smooth animations
- **Expo AV** for audio recording
- **Bottom Sheet** for intuitive UI interactions

### **Backend & Storage**
- **SQLite** for local storage
- **Supabase** for cloud sync (optional)
- **AsyncStorage** for app preferences

### **AI & Services**
- **OpenAI Whisper API** for voice transcription
- **Custom AI Analysis** for content understanding
- **Expo Location** for GPS and place data
- **Expo Image Picker** for media capture

### **Architecture**
- **Context API** for state management
- **Service Layer** pattern for data operations
- **Modular Components** for reusability
- **Clean separation** between UI and business logic

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator or Android Emulator
- OpenAI API key for transcription

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/vidaai-journal.git
cd vidaai-journal

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your OpenAI API key to .env

# Start the development server
npx expo start
```

### Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url (optional)
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key (optional)
```

### Running the App

```bash
# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator  
npx expo start --android

# Clear cache if needed
npx expo start --clear
```

## 📱 App Structure

```
src/
├── components/          # Reusable UI components
│   ├── RecordButton.tsx
│   ├── EntryEditor.tsx
│   ├── EntryPreview.tsx
│   └── MoodPicker.tsx
├── screens/            # Main app screens
│   ├── CreateScreen.tsx
│   ├── HistoryScreen.tsx
│   └── AnalyticsScreen.tsx
├── services/           # Business logic & APIs
│   ├── transcription.ts
│   ├── aiAnalyzer.ts
│   ├── entries.ts
│   └── locationService.ts
├── context/            # State management
│   └── JournalContext.tsx
├── types/              # TypeScript definitions
│   └── journal.ts
├── constants/          # App configuration
│   └── theme.ts
└── utils/              # Helper functions
    ├── format.ts
    └── id.ts
```

## 🎨 Key Components

### **CreateScreen**
The heart of the app - beautiful voice recording interface with:
- Large animated record button with pulse effect
- Real-time transcription display
- Bottom sheet editor for refinement
- Rich media attachment options

### **EntryEditor**
Comprehensive editing interface featuring:
- Title and content editing
- Photo attachment and preview
- Location selection
- Mood picker with emoji feedback
- Date override functionality

### **AI Analysis Pipeline**
Intelligent content processing that:
- Generates contextual titles from content
- Extracts emotional sentiment and themes
- Creates searchable tags for future analytics
- Maintains user privacy with local processing options

## 🔧 Development

### **Key Dependencies**
```json
{
  "expo": "~51.0.0",
  "expo-router": "~3.5.0", 
  "expo-av": "~14.0.0",
  "react-native-reanimated": "~3.10.0",
  "@gorhom/bottom-sheet": "^4.6.0",
  "expo-image-picker": "~15.0.0",
  "expo-location": "~17.0.0"
}
```

### **Development Commands**
```bash
# Type checking
npx tsc --noEmit

# Linting
npx expo lint

# Testing
npm test

# Build for production
npx expo build:ios
npx expo build:android
```

## 🚧 Roadmap

### **Phase 1: Core Features** ✅
- [x] Voice recording and transcription
- [x] AI-powered title generation
- [x] Photo attachments
- [x] Location integration
- [x] Local storage with SQLite
- [x] Beautiful UI with animations

### **Phase 2: Enhanced Intelligence** 🔄
- [ ] Advanced sentiment analysis
- [ ] Mood pattern recognition
- [ ] Smart reminder system
- [ ] Export functionality
- [ ] Search and filtering

### **Phase 3: Social & Sync** 📋
- [ ] Cloud synchronization
- [ ] End-to-end encryption
- [ ] Sharing capabilities
- [ ] Analytics dashboard
- [ ] Multi-device support

### **Phase 4: Advanced Features** 🔮
- [ ] Voice emotion detection
- [ ] Habit tracking integration
- [ ] Wellness insights
- [ ] Custom AI models
- [ ] API for third-party integrations

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for the Whisper API that makes voice transcription possible
- **Expo** for the amazing development platform
- **React Native Community** for the powerful ecosystem
- **Contributors** who help make this app better

## 📞 Support

- 📧 Email: support@vidaai.app
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/vidaai-journal/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/vidaai-journal/discussions)

---

<div align="center">
  <p>Made with ❤️ for mindful journaling</p>
  <p>
    <a href="#-features">Features</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-development">Development</a> •
    <a href="#-roadmap">Roadmap</a>
  </p>
</div># JeevunAI

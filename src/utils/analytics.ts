// analytics.ts - Centralized analytics logger with session tracking
import PostHog from 'posthog-react-native'
import { AppState } from 'react-native'

class AnalyticsLogger {
  private isInitialized: boolean
  private userId: string | null
  private sessionId: string | null
  private client: PostHog | null
  private recentEvents: Set<string>
  private sessionStartTime: number | null
  private foregroundTime: number | null

  constructor() {
    this.isInitialized = false
    this.userId = null
    this.sessionId = null
    this.client = null
    this.recentEvents = new Set()
    this.sessionStartTime = null
    this.foregroundTime = null
  }

  // Initialize PostHog and start app lifecycle tracking
  async init(apiKey?: string, config: any = {}) {
    const key = apiKey || process.env.EXPO_PUBLIC_POSTHOG_API_KEY
    
    if (!key) {
      console.warn('PostHog API key not found in environment variables or parameters')
      return
    }

    this.client = new PostHog(key, {
      host: 'https://app.posthog.com',
      flushAt: 1,
      flushInterval: 1000,
      ...config
    })
    this.isInitialized = true
    this.sessionId = this.generateSessionId()
    this.sessionStartTime = Date.now()
    
    // Start session tracking
    this.logAppLaunched()
    this.setupAppStateTracking()
    
    console.log('Analytics initialized with session tracking')
  }

  // Set up app state change listeners for session tracking
  private setupAppStateTracking() {
    this.foregroundTime = Date.now()
    
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // App came to foreground
        this.foregroundTime = Date.now()
        this.logAppForeground()
        
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background
        if (this.foregroundTime) {
          const sessionDuration = Date.now() - this.foregroundTime
          this.logAppBackground(sessionDuration)
        }
      }
    }

    AppState.addEventListener('change', handleAppStateChange)
  }

  // Session lifecycle events
  logAppLaunched() {
    this.logTrack('app_launched', {
      app_version: '1.0.0',
      device_type: 'mobile',
      launch_time: Date.now()
    })
  }

  logAppForeground() {
    this.logTrack('app_foreground', {
      timestamp: Date.now()
    })
  }

  logAppBackground(foregroundDuration: number) {
    this.logTrack('app_background', {
      foreground_duration_ms: foregroundDuration,
      foreground_duration_seconds: Math.round(foregroundDuration / 1000)
    })
  }

  logAppTerminated() {
    if (this.sessionStartTime) {
      const totalSessionTime = Date.now() - this.sessionStartTime
      this.logTrack('app_terminated', {
        total_session_ms: totalSessionTime,
        total_session_seconds: Math.round(totalSessionTime / 1000)
      })
    }
  }

  // Set user context (call after login)
  logSetUser(userId: string, userProperties: Record<string, any> = {}) {
    this.userId = userId
    if (this.isInitialized && this.client) {
      this.client.identify(userId, {
        ...userProperties,
        session_id: this.sessionId
      })
    }
  }

  // Clear user context (call on logout)
  logClearUser() {
    this.userId = null
    this.sessionId = this.generateSessionId()
    if (this.isInitialized && this.client) {
      this.client.reset()
    }
  }

  // Generate a new session ID
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Base tracking method
  logTrack(eventName: string, properties: Record<string, any> = {}) {
    if (!this.isInitialized || !this.client) {
      console.warn('Analytics not initialized')
      return
    }

    // Deduplication for certain events
    let dedupKey = null
    if (['entry_created', 'entry_opened', 'entry_deleted'].includes(eventName)) {
      dedupKey = `${eventName}_${properties.entry_id}_${Date.now().toString().slice(0, -3)}`
      
      if (this.recentEvents.has(dedupKey)) {
        console.log('🚫 Skipping duplicate event:', eventName, properties.entry_id)
        return
      }
      
      this.recentEvents.add(dedupKey)
      setTimeout(() => this.recentEvents.delete(dedupKey!), 30000)
    }

    const baseProperties = {
      user_id: this.userId,
      session_id: this.sessionId,
      timestamp: Date.now()
    }

    console.log('📊 LOGGING TRACK - ', eventName)

    this.client.capture(eventName, {
      ...baseProperties,
      ...properties
    })
  }

  // Authentication events
  logUserSignedUp(signupMethod: string = 'email', userProperties: Record<string, any> = {}) {
    this.logTrack('user_signed_up', {
      signup_method: signupMethod,
      ...userProperties
    })
  }

  logUserLoggedIn(loginMethod: string = 'email') {
    this.logTrack('user_logged_in', {
      login_method: loginMethod
    })
  }

  logUserLoggedOut() {
    this.logTrack('user_logged_out')
    this.logClearUser()
  }

  // Entry events
  logEntryCreated(entryId: string, entryLength: number, entryDate: string | null = null, creationMethod: string = 'manual', createdAt?: string, hasPhotos: boolean = false, hasLocation: boolean = false, tagsCount: number = 0) {
    this.logTrack('entry_created', {
      entry_id: entryId,
      entry_length: entryLength,
      entry_date: entryDate || new Date().toISOString().split('T')[0],
      creation_method: creationMethod,
      created_at: createdAt || new Date().toISOString(),
      has_photos: hasPhotos,
      has_location: hasLocation,
      tags_count: tagsCount
    })
  }

  logEntryOpened(entryId: string, entryDate: string | null = null) {
    console.log('LOGGING ENTRY OPENED')
    this.logTrack('entry_opened', {
      entry_id: entryId,
      entry_date: entryDate
    })
  }

  logEntryDayOpened(date: string, entryCount: number | null = null) {
    this.logTrack('entry_day_opened', {
      entry_date: date,
      entry_count: entryCount
    })
  }

  // Page/screen tracking
  logPageViewed(pageName: string, additionalProperties: Record<string, any> = {}) {
    this.logTrack('page_viewed', {
      page_name: pageName,
      ...additionalProperties
    })
  }
}

// Create singleton instance
const analytics = new AnalyticsLogger()

export default analytics
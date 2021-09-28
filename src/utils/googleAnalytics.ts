import { useCallback, useEffect, useState } from 'react'
import ReactGA, { EventArgs } from 'react-ga'
import { getCurrentEnvironment, getNetworkInfo } from 'src/config'

import { getGoogleAnalyticsTrackingID } from 'src/config'
import { COOKIES_KEY } from 'src/logic/cookies/model/cookie'
import { loadFromCookie, removeCookie } from 'src/logic/cookies/utils'
import { IS_PRODUCTION } from './constants'

export const SAFE_NAVIGATION_EVENT = 'Safe Navigation'

export const COOKIES_LIST = [
  { name: '_ga', path: '/' },
  { name: '_gat', path: '/' },
  { name: '_gid', path: '/' },
]

const IS_STAGING = getCurrentEnvironment() === 'staging'
const shouldUseGoogleAnalytics = IS_PRODUCTION || IS_STAGING

export const trackGAEvent: typeof ReactGA.event = (...args) => {
  return shouldUseGoogleAnalytics ? ReactGA.event(...args) : console.info('[GA] - Event:', ...args)
}
const trackGAPageview: typeof ReactGA.pageview = (...args) => {
  return shouldUseGoogleAnalytics ? ReactGA.pageview(...args) : console.info('[GA] - Pageview:', ...args)
}

let analyticsLoaded = false
export const loadGoogleAnalytics = (): void => {
  if (analyticsLoaded) {
    return
  }

  console.info(
    shouldUseGoogleAnalytics
      ? 'Loading Google Analytics...'
      : 'Google Analytics will not load in the development environment, but log instead.',
  )

  const gaTrackingId = getGoogleAnalyticsTrackingID()
  const networkInfo = getNetworkInfo()
  const customDimensions = {
    anonymizeIp: true,
    appName: `Gnosis Safe Multisig (${networkInfo.label})`,
    appId: `io.gnosis.safe.${networkInfo.label.toLowerCase()}`,
    appVersion: process.env.REACT_APP_APP_VERSION,
  }

  if (shouldUseGoogleAnalytics) {
    if (!gaTrackingId) {
      console.error('In order to use Google Analytics you need to add a tracking ID.')
    } else {
      ReactGA.initialize(gaTrackingId)
      ReactGA.set(customDimensions)
    }
  } else {
    console.info('[GA] - Custom dimensions:', customDimensions)
  }

  analyticsLoaded = true
}

type UseAnalyticsResponse = {
  trackPage: (path: string) => void
  trackEvent: (event: EventArgs) => void
}

export const useAnalytics = (): UseAnalyticsResponse => {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false)

  useEffect(() => {
    async function fetchCookiesFromStorage() {
      const cookiesState = await loadFromCookie(COOKIES_KEY)
      if (cookiesState) {
        const { acceptedAnalytics } = cookiesState
        setAnalyticsAllowed(acceptedAnalytics)
      }
    }
    fetchCookiesFromStorage()
  }, [])

  const trackPage = useCallback(
    (page) => {
      if (analyticsAllowed && analyticsLoaded) {
        trackGAPageview(page)
      }
    },
    [analyticsAllowed],
  )

  const trackEvent = useCallback(
    (event: EventArgs) => {
      if (analyticsAllowed && analyticsLoaded) {
        trackGAEvent(event)
      }
    },
    [analyticsAllowed],
  )

  return { trackPage, trackEvent }
}

// we remove GA cookies manually as react-ga does not provides a utility for it.
export const removeCookies = (): void => {
  const subDomain = location.host.split('.').slice(-2).join('.')
  COOKIES_LIST.forEach((cookie) => removeCookie(cookie.name, cookie.path, `.${subDomain}`))
}

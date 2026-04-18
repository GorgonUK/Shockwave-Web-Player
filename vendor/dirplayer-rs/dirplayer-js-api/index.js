let vmCallbacks = undefined;
const DIRPLAYER_DEBUG_MESSAGE_EVENT = 'shockwave-web-player:dirplayer-debug-message';

function dispatchHostEvent(name, detail) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }
  if (typeof CustomEvent !== 'function') {
    return;
  }
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function registerVmCallbacks(callbacks) {
  vmCallbacks = callbacks;
}

export function onMovieLoaded(result) {
  vmCallbacks.onMovieLoaded(result)
}

export function onCastListChanged(castList) {
  vmCallbacks.onCastListChanged(castList)
}

export function onCastLibNameChanged(castId, name) {
  vmCallbacks.onCastLibNameChanged(castId, name)
}

export function onCastMemberListChanged(castNumber, members) {
  vmCallbacks.onCastMemberListChanged(castNumber, members)
}

export function onCastMemberChanged(...args) {
  vmCallbacks.onCastMemberChanged(...args)
}

export function onScoreChanged(snapshot) {
  vmCallbacks.onScoreChanged(snapshot)
}

export function onFrameChanged(frame) {
  vmCallbacks.onFrameChanged(frame)
}

export function onScriptError(err) {
  vmCallbacks.onScriptError(err)
}

export function onScopeListChanged(scopeList) {
  vmCallbacks.onScopeListChanged(scopeList)
}

export function onBreakpointListChanged(breakpointList) {
  vmCallbacks.onBreakpointListChanged(breakpointList)
}

export function onScriptErrorCleared() {
  vmCallbacks.onScriptErrorCleared()
}

export function onGlobalListChanged(globalList) {
  vmCallbacks.onGlobalListChanged(globalList)
}

export function onDebugMessage(message) {
  dispatchHostEvent(DIRPLAYER_DEBUG_MESSAGE_EVENT, {
    source: 'dirplayer-js-api',
    message,
  });
  vmCallbacks.onDebugMessage(message)
}

export function onDebugContent(content) {
  vmCallbacks.onDebugContent(content)
}

export function onScheduleTimeout(name, period) {
  vmCallbacks.onScheduleTimeout(name, period)
}

export function onClearTimeout(name) {
  vmCallbacks.onClearTimeout(name)
}

export function onClearAllTimeouts() {
  vmCallbacks.onClearAllTimeouts()
}

export function onDatumSnapshot(datumRef, snapshot) {
  vmCallbacks.onDatumSnapshot(datumRef, snapshot)
}

export function onScriptInstanceSnapshot(instanceId, snapshot) {
  vmCallbacks.onScriptInstanceSnapshot(instanceId, snapshot)
}

export function onChannelChanged(channel, value) {
  vmCallbacks.onChannelChanged(channel, value)
}

export function onChannelDisplayNameChanged(channel, displayName) {
  vmCallbacks.onChannelDisplayNameChanged(channel, displayName)
}

export function onExternalEvent(event) {
  if (vmCallbacks?.onExternalEvent) {
    vmCallbacks.onExternalEvent(event);
  } else {
    console.log('🔔 externalEvent:', event);
  }
}

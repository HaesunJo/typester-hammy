// Shared types between main and renderer processes
export var IPCChannels;
(function (IPCChannels) {
    IPCChannels["TYPING_EVENT"] = "typing-event";
    IPCChannels["HAMMY_REACTION"] = "hammy-reaction";
    IPCChannels["DASHBOARD_OPEN"] = "dashboard-open";
    IPCChannels["DASHBOARD_CLOSE"] = "dashboard-close";
    IPCChannels["STATISTICS_REQUEST"] = "statistics-request";
    IPCChannels["STATISTICS_RESPONSE"] = "statistics-response";
    IPCChannels["SETTINGS_UPDATE"] = "settings-update";
    IPCChannels["PING"] = "ping";
    IPCChannels["PONG"] = "pong";
})(IPCChannels || (IPCChannels = {}));

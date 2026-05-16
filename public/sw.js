self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Task Reminder", {
      body: data.body ?? "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { taskId: data.taskId },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const taskId = event.notification.data?.taskId;
  event.waitUntil(
    clients.openWindow(taskId ? `/tasks/${taskId}` : "/")
  );
});

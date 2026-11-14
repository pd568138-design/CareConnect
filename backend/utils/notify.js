let ioInstance;
export function setIO(io){ioInstance=io;}
export function notifyUser(userId,message,type="info"){if(ioInstance&&userId)ioInstance.to(String(userId)).emit("notification",{message,type,createdAt:new Date().toISOString()});}
export function notifyRole(role,message,type="info"){if(ioInstance)ioInstance.to(`role:${role}`).emit("notification",{message,type,createdAt:new Date().toISOString()});}

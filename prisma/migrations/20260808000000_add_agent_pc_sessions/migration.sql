-- AddTable: agent_pc_sessions
-- Tracks which employee is currently logged into which PC.
-- Created by HR Portal login, deleted on logout.
-- This is the single source of truth for employee-PC mapping.

CREATE TABLE "agent_pc_sessions" (
    "id"               TEXT NOT NULL,
    "pcName"           TEXT NOT NULL,
    "employeeId"       TEXT NOT NULL,
    "loggedInAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt"  TIMESTAMP(3),
    "agentVersion"     TEXT,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_pc_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_pc_sessions_pcName_key" ON "agent_pc_sessions"("pcName");
CREATE UNIQUE INDEX "agent_pc_sessions_employeeId_key" ON "agent_pc_sessions"("employeeId");
CREATE INDEX "agent_pc_sessions_pcName_idx" ON "agent_pc_sessions"("pcName");
CREATE INDEX "agent_pc_sessions_employeeId_idx" ON "agent_pc_sessions"("employeeId");

-- AddForeignKey
ALTER TABLE "agent_pc_sessions" ADD CONSTRAINT "agent_pc_sessions_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import asyncio
import json
import uuid
from datetime import datetime

app = FastAPI(title="Multi-Agent Coordination System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class ChatMessage(BaseModel):
    message: str

class TaskResponse(BaseModel):
    task_id: str
    status: str
    subtasks: List[Dict[str, Any]]
    results: Dict[str, Any]
    chat_response: str

# LLM Parser - Simulates Claude/GPT-4 task decomposition
class LLMParser:
    def parse_instruction(self, instruction: str) -> Dict[str, Any]:
        """Parse natural language into structured subtasks"""
        # Mock LLM parsing - in reality, this would call Claude/OpenAI
        instruction_lower = instruction.lower()
        
        subtasks = []
        
        if "hubspot" in instruction_lower or "lead" in instruction_lower or "contact" in instruction_lower:
            subtasks.append({
                "id": str(uuid.uuid4()),
                "agent": "hubspot",
                "action": "get_leads",
                "parameters": {"timeframe": "yesterday"},
                "dependencies": []
            })
        
        if "notion" in instruction_lower or "notes" in instruction_lower or "meeting" in instruction_lower:
            subtasks.append({
                "id": str(uuid.uuid4()),
                "agent": "notion",
                "action": "get_meeting_notes",
                "parameters": {"date": "yesterday"},
                "dependencies": []
            })
        
        if "email" in instruction_lower or "gmail" in instruction_lower or "send" in instruction_lower:
            deps = []
            if any("hubspot" in task["agent"] for task in subtasks):
                deps.append("hubspot")
            if any("notion" in task["agent"] for task in subtasks):
                deps.append("notion")
            
            subtasks.append({
                "id": str(uuid.uuid4()),
                "agent": "gmail",
                "action": "send_email",
                "parameters": {"type": "follow_up"},
                "dependencies": deps
            })
        
        return {
            "original_instruction": instruction,
            "subtasks": subtasks,
            "execution_plan": "sequential" if len(subtasks) > 1 else "single"
        }

# Shared Task Memory
class TaskMemory:
    def __init__(self):
        self.data = {}
    
    def store(self, key: str, value: Any):
        self.data[key] = value
    
    def retrieve(self, key: str) -> Any:
        return self.data.get(key)
    
    def get_all(self) -> Dict[str, Any]:
        return self.data.copy()

# Agents
class HubSpotAgent:
    def __init__(self, memory: TaskMemory):
        self.memory = memory
    
    async def get_leads(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Mock HubSpot API call"""
        await asyncio.sleep(1)  # Simulate API delay
        
        mock_leads = [
            {
                "id": "lead_001",
                "name": "John Smith",
                "email": "john.smith@techcorp.com",
                "company": "TechCorp Inc",
                "phone": "+1-555-0123"
            },
            {
                "id": "lead_002", 
                "name": "Sarah Johnson",
                "email": "sarah.j@innovate.io",
                "company": "Innovate Solutions",
                "phone": "+1-555-0456"
            }
        ]
        
        self.memory.store("leads", mock_leads)
        return {
            "status": "success",
            "data": mock_leads,
            "message": f"Retrieved {len(mock_leads)} leads from HubSpot"
        }

class NotionAgent:
    def __init__(self, memory: TaskMemory):
        self.memory = memory
    
    async def get_meeting_notes(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Mock Notion API call"""
        await asyncio.sleep(1.5)  # Simulate API delay
        
        mock_notes = {
            "meeting_id": "zoom_meeting_001",
            "title": "Sales Discovery Call - July 25, 2025",
            "attendees": ["John Smith", "Sarah Johnson"],
            "key_points": [
                "Both companies interested in our enterprise solution",
                "Budget approved for Q3 implementation",
                "Need technical demo scheduled for next week"
            ],
            "action_items": [
                "Send follow-up email with pricing",
                "Schedule technical demo",
                "Share case studies"
            ]
        }
        
        self.memory.store("meeting_notes", mock_notes)
        return {
            "status": "success", 
            "data": mock_notes,
            "message": "Retrieved meeting notes from Notion"
        }

class GmailAgent:
    def __init__(self, memory: TaskMemory):
        self.memory = memory
    
    async def send_email(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Mock Gmail API call"""
        await asyncio.sleep(2)  # Simulate email sending delay
        
        leads = self.memory.retrieve("leads") or []
        notes = self.memory.retrieve("meeting_notes")
        
        if not leads:
            return {
                "status": "error",
                "message": "No leads found to email"
            }
        
        # Mock email composition and sending
        emails_sent = []
        for lead in leads:
            email_content = f"""
Subject: Follow-up from our Zoom call

Hi {lead['name']},

Thank you for joining our discovery call yesterday. Based on our discussion about {lead['company']}'s needs, I wanted to follow up with the next steps we discussed.

Key points from our meeting:
- Enterprise solution implementation for Q3
- Technical demo scheduling
- Pricing and case studies

I'll be in touch soon to schedule the technical demo we discussed.

Best regards,
Sales Team
            """.strip()
            
            emails_sent.append({
                "to": lead["email"],
                "subject": "Follow-up from our Zoom call",
                "status": "sent",
                "sent_at": datetime.now().isoformat()
            })
        
        self.memory.store("emails_sent", emails_sent)
        return {
            "status": "success",
            "data": emails_sent,
            "message": f"Sent {len(emails_sent)} follow-up emails via Gmail"
        }

# Agent Manager
class AgentManager:
    def __init__(self):
        self.memory = TaskMemory()
        self.agents = {
            "hubspot": HubSpotAgent(self.memory),
            "notion": NotionAgent(self.memory),
            "gmail": GmailAgent(self.memory)
        }
    
    async def execute_task(self, agent_name: str, action: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a task with the specified agent"""
        if agent_name not in self.agents:
            return {"status": "error", "message": f"Agent {agent_name} not found"}
        
        agent = self.agents[agent_name]
        
        try:
            if hasattr(agent, action):
                result = await getattr(agent, action)(parameters)
                return result
            else:
                return {"status": "error", "message": f"Action {action} not supported by {agent_name}"}
        except Exception as e:
            return {"status": "error", "message": f"Error executing {action}: {str(e)}"}

# Orchestrator
class Orchestrator:
    def __init__(self):
        self.parser = LLMParser()
        self.agent_manager = AgentManager()
    
    async def execute_instruction(self, instruction: str) -> TaskResponse:
        """Main orchestration logic"""
        task_id = str(uuid.uuid4())
        
        # Parse instruction
        parsed = self.parser.parse_instruction(instruction)
        subtasks = parsed["subtasks"]
        
        # Execute subtasks with dependency handling
        results = {}
        execution_log = []
        
        for subtask in subtasks:
            # Check dependencies
            if subtask["dependencies"]:
                for dep in subtask["dependencies"]:
                    if dep not in [completed_task["agent"] for completed_task in execution_log]:
                        # Find and execute dependency first
                        dep_task = next((t for t in subtasks if t["agent"] == dep), None)
                        if dep_task and dep_task["id"] not in [t["id"] for t in execution_log]:
                            dep_result = await self.agent_manager.execute_task(
                                dep_task["agent"], 
                                dep_task["action"], 
                                dep_task["parameters"]
                            )
                            execution_log.append({**dep_task, "result": dep_result})
                            results[dep_task["agent"]] = dep_result
            
            # Execute current subtask
            if subtask["id"] not in [t["id"] for t in execution_log]:
                result = await self.agent_manager.execute_task(
                    subtask["agent"], 
                    subtask["action"], 
                    subtask["parameters"]
                )
                execution_log.append({**subtask, "result": result})
                results[subtask["agent"]] = result
        
        # Generate chat response
        chat_response = self._generate_chat_response(results, parsed["original_instruction"])
        
        return TaskResponse(
            task_id=task_id,
            status="completed",
            subtasks=execution_log,
            results=results,
            chat_response=chat_response
        )
    
    def _generate_chat_response(self, results: Dict[str, Any], instruction: str) -> str:
        """Generate human-readable response"""
        response_parts = ["✅ Task completed successfully!\n"]
        
        for agent, result in results.items():
            if result["status"] == "success":
                response_parts.append(f"• {agent.title()}: {result['message']}")
            else:
                response_parts.append(f"• {agent.title()}: ❌ {result['message']}")
        
        return "\n".join(response_parts)

# Global orchestrator instance
orchestrator = Orchestrator()

# API Endpoints
@app.post("/api/chat", response_model=TaskResponse)
async def process_chat_message(message: ChatMessage):
    """Process chat message and execute multi-agent tasks"""
    try:
        result = await orchestrator.execute_instruction(message.message)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
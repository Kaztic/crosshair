from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
import logging
import re

from app.models import CodeImproveRequest, CodeImproveResponse, ConversationMessage, CodeEdit, DiffInfo
from app.services.gemini_service import (
    improve_code, 
    generate_code, 
    APIKeyError, 
    RateLimitError, 
    ModelError, 
    AIServiceError
)

# Set up logger
logger = logging.getLogger(__name__)

router = APIRouter()

def extract_precise_edits(improved_code):
    """
    Extract precise edits from the formatted code response.
    
    Args:
        improved_code: The formatted code response from the AI
        
    Returns:
        A list of CodeEdit objects
    """
    edits = []
    # Match patterns like ```startLine:endLine:filepath\ncode```
    pattern = r"```(\d+):(\d+):([^\n]+)\n([\s\S]*?)```"
    matches = re.finditer(pattern, improved_code)
    
    for match in matches:
        try:
            start_line = int(match.group(1))
            end_line = int(match.group(2))
            filepath = match.group(3)
            code = match.group(4)
            
            edits.append(CodeEdit(
                startLine=start_line,
                endLine=end_line,
                filepath=filepath,
                code=code
            ))
        except Exception as e:
            logger.error(f"Error parsing edit specification: {e}")
    
    return edits

@router.post("/improve-code", response_model=CodeImproveResponse)
async def improve_code_endpoint(request: CodeImproveRequest):
    """
    Endpoint to improve code with AI or generate new code from a prompt.
    
    If code is empty, it will generate new code based on the prompt.
    If code is provided, it will improve the existing code based on the prompt.
    
    Optionally accepts conversation history to maintain context between requests.
    """
    try:
        # Check if the prompt is empty
        if not request.prompt or request.prompt.strip() == "":
            logger.warning("Empty prompt received")
            raise HTTPException(status_code=400, detail="Prompt cannot be empty")
        
        # Get conversation history if provided
        conversation_history = request.conversationHistory or []
        
        # Check if whole file mode is enabled
        whole_file = request.wholeFile or False
        
        # Log conversation history length and whole file mode
        if conversation_history:
            logger.info(f"Received conversation history with {len(conversation_history)} messages")
        logger.info(f"Whole file mode: {whole_file}")
        
        # Determine if we're generating new code or improving existing code
        if not request.code or request.code.strip() == "":
            # Generate new code from prompt
            logger.info(f"Generating code with prompt length: {len(request.prompt)}")
            
            # Create a more contextual prompt by including conversation history
            full_prompt = request.prompt
            if conversation_history:
                context = "\n\nPrevious conversation context:\n"
                for msg in conversation_history:
                    role_prefix = "User: " if msg.role == "user" else "Assistant: "
                    context += f"{role_prefix}{msg.content}\n"
                full_prompt = context + "\n\nCurrent request: " + request.prompt
                logger.info(f"Enhanced prompt with conversation context, new length: {len(full_prompt)}")
            
            generated_code, explanation, diff_info = await generate_code(full_prompt, whole_file)
            precise_edits = extract_precise_edits(generated_code) if not whole_file else []
            
            return CodeImproveResponse(
                improvedCode=generated_code,
                explanation=explanation,
                preciseEdits=precise_edits,
                diffInfo=diff_info
            )
        else:
            # Improve existing code
            logger.info(f"Improving code (length: {len(request.code)}) with prompt length: {len(request.prompt)}")
            
            # Create a more contextual prompt by including conversation history
            full_prompt = request.prompt
            if conversation_history:
                context = "\n\nPrevious conversation context:\n"
                for msg in conversation_history:
                    role_prefix = "User: " if msg.role == "user" else "Assistant: "
                    context += f"{role_prefix}{msg.content}\n"
                full_prompt = context + "\n\nCurrent request: " + request.prompt
                logger.info(f"Enhanced prompt with conversation context, new length: {len(full_prompt)}")
            
            improved_code, explanation, diff_info = await improve_code(request.code, full_prompt, whole_file)
            precise_edits = extract_precise_edits(improved_code) if not whole_file else []
            
            return CodeImproveResponse(
                improvedCode=improved_code,
                explanation=explanation,
                preciseEdits=precise_edits,
                diffInfo=diff_info
            )
    
    except EnvironmentError as e:
        # Handle API key configuration issues
        logger.error(f"Environment error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail="API key not configured. Please check the server configuration."
        )
    
    except APIKeyError as e:
        logger.error(f"API key error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="API key issue. Please contact the administrator."
        )
    
    except RateLimitError as e:
        logger.error(f"Rate limit error: {str(e)}")
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please try again later."
        )
    
    except ModelError as e:
        logger.error(f"Model error: {str(e)}")
        raise HTTPException(
            status_code=503,
            detail="AI model service is currently unavailable. Please try again later."
        )
    
    except AIServiceError as e:
        logger.error(f"AI service error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {str(e)}"
        )
    
    except Exception as e:
        # Handle other errors
        logger.exception(f"Unexpected error processing code: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing code") 
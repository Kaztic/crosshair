import os
import google.generativeai as genai
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get Gemini API key from environment variable
gemini_api_key = os.getenv("GEMINI_API_KEY")
if not gemini_api_key:
    logger.error("GEMINI_API_KEY environment variable is not set")
    raise EnvironmentError("GEMINI_API_KEY environment variable is not set")

# Configure the Gemini API
genai.configure(api_key=gemini_api_key)

class AIServiceError(Exception):
    """Base class for AI service errors"""
    pass

class APIKeyError(AIServiceError):
    """Exception raised when API key is invalid or missing"""
    pass

class ModelError(AIServiceError):
    """Exception raised when there's a problem with the model"""
    pass

class RateLimitError(AIServiceError):
    """Exception raised when rate limit is exceeded"""
    pass

async def generate_code(prompt: str):
    """
    Use Google Gemini API to generate code from scratch based on the user's prompt.
    
    Args:
        prompt: The user's instructions for what code to generate
        
    Returns:
        A tuple of (generated_code, explanation)
    
    Raises:
        APIKeyError: If API key is invalid
        RateLimitError: If rate limit is exceeded
        ModelError: If there's an issue with the model
        AIServiceError: For other AI service related errors
        Exception: For unexpected errors
    """
    try:
        model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
        
        logger.info(f"Generating code with model: {model_name}")
        
        # Initialize the model
        model = genai.GenerativeModel(model_name)
        
        # Create the prompt for Gemini
        system_prompt = """You are an expert game developer code assistant. 
You will be given a prompt to generate code.
Return the generated code and explain your implementation approach.
Always put the generated code inside ```code blocks```.
After the code block, provide a clear, detailed explanation of the implementation."""
        
        user_content = f"""I need you to generate code according to this prompt:

Instructions: {prompt}

Please generate high-quality, clean, and well-documented code.
Return your response with the code in a code block and a detailed explanation of your implementation."""
        
        # Create a chat session
        chat = model.start_chat(history=[
            {"role": "user", "parts": [system_prompt]}
        ])
        
        # Get response from model
        logger.info("Sending request to Gemini API for code generation")
        response = await chat.send_message_async(user_content)
        result = response.text
        logger.info("Received response from Gemini API")
        
        # Parse the result to separate code and explanation
        generated_code, explanation = parse_gemini_response(result)
        logger.info(f"Successfully parsed response: code length={len(generated_code)}, explanation length={len(explanation)}")
        
        return generated_code, explanation
    
    except genai.types.BlockedPromptException as e:
        logger.error(f"Blocked prompt: {str(e)}")
        raise AIServiceError(f"Your prompt was blocked by the AI service: {str(e)}")
    except genai.types.StopCandidateException as e:
        logger.error(f"Generation stopped: {str(e)}")
        raise AIServiceError(f"The AI model stopped generating: {str(e)}")
    except genai.types.InternalServerException as e:
        logger.error(f"Model server error: {str(e)}")
        raise ModelError(f"Internal server error from AI service: {str(e)}")
    except genai.types.InvalidArgumentException as e:
        if "api_key" in str(e).lower():
            logger.error(f"API key error: {str(e)}")
            raise APIKeyError(f"Invalid API key: {str(e)}")
        logger.error(f"Invalid argument: {str(e)}")
        raise AIServiceError(f"Invalid argument: {str(e)}")
    except genai.types.RateLimitException as e:
        logger.error(f"Rate limit exceeded: {str(e)}")
        raise RateLimitError(f"Rate limit exceeded: {str(e)}")
    except Exception as e:
        logger.exception(f"Unexpected error generating code: {str(e)}")
        raise

async def improve_code(code: str, prompt: str):
    """
    Use Google Gemini API to improve the code based on the user's prompt.
    
    Args:
        code: The original code to improve
        prompt: The user's instructions for how to improve the code
        
    Returns:
        A tuple of (improved_code, explanation)
    
    Raises:
        APIKeyError: If API key is invalid
        RateLimitError: If rate limit is exceeded
        ModelError: If there's an issue with the model
        AIServiceError: For other AI service related errors
        Exception: For unexpected errors
    """
    try:
        model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
        
        logger.info(f"Improving code with model: {model_name}")
        
        # Initialize the model
        model = genai.GenerativeModel(model_name)
        
        # Create the prompt for Gemini
        system_prompt = """You are an expert game developer code assistant. 
You will be given some code and a prompt to improve it.
Return the improved code and explain the changes you made.
Always put the improved code inside ```code blocks```.
After the code block, provide a clear, detailed explanation of the changes."""
        
        user_content = f"""Here is the code I want to improve:

```
{code}
```

Instructions: {prompt}

Please improve this code according to the instructions. 
Return your response with the improved code in a code block and a detailed explanation of the changes."""
        
        # Create a chat session
        chat = model.start_chat(history=[
            {"role": "user", "parts": [system_prompt]}
        ])
        
        # Get response from model
        logger.info("Sending request to Gemini API for code improvement")
        response = await chat.send_message_async(user_content)
        result = response.text
        logger.info("Received response from Gemini API")
        
        # Parse the result to separate code and explanation
        improved_code, explanation = parse_gemini_response(result)
        logger.info(f"Successfully parsed response: code length={len(improved_code)}, explanation length={len(explanation)}")
        
        return improved_code, explanation
    
    except genai.types.BlockedPromptException as e:
        logger.error(f"Blocked prompt: {str(e)}")
        raise AIServiceError(f"Your prompt was blocked by the AI service: {str(e)}")
    except genai.types.StopCandidateException as e:
        logger.error(f"Generation stopped: {str(e)}")
        raise AIServiceError(f"The AI model stopped generating: {str(e)}")
    except genai.types.InternalServerException as e:
        logger.error(f"Model server error: {str(e)}")
        raise ModelError(f"Internal server error from AI service: {str(e)}")
    except genai.types.InvalidArgumentException as e:
        if "api_key" in str(e).lower():
            logger.error(f"API key error: {str(e)}")
            raise APIKeyError(f"Invalid API key: {str(e)}")
        logger.error(f"Invalid argument: {str(e)}")
        raise AIServiceError(f"Invalid argument: {str(e)}")
    except genai.types.RateLimitException as e:
        logger.error(f"Rate limit exceeded: {str(e)}")
        raise RateLimitError(f"Rate limit exceeded: {str(e)}")
    except Exception as e:
        logger.exception(f"Unexpected error improving code: {str(e)}")
        raise

def parse_gemini_response(response: str):
    """
    Parse the Gemini response to extract the improved code and explanation.
    
    Args:
        response: The raw response from Gemini
        
    Returns:
        A tuple of (improved_code, explanation)
    """
    # Default values in case parsing fails
    improved_code = ""
    explanation = ""
    
    try:
        # Try to extract code blocks first
        code_blocks = []
        parts = response.split("```")
        
        for i in range(1, len(parts), 2):
            # Check if we have valid index and the part might be a code block
            if i < len(parts):
                code_block = parts[i]
                # If first line looks like a language name, strip it
                code_lines = code_block.strip().split("\n")
                if not code_lines[0].startswith(" ") and len(code_lines[0].split()) <= 2:
                    code_block = "\n".join(code_lines[1:])
                code_blocks.append(code_block)
        
        # If we found at least one code block, use the first one as the improved code
        if code_blocks:
            improved_code = code_blocks[0]
            
            # Try to extract explanation from the text outside code blocks
            explanation_parts = []
            for i in range(0, len(parts), 2):
                explanation_parts.append(parts[i])
            
            explanation = "\n".join(explanation_parts).strip()
            
            # If explanation is too short, use the rest of the response
            if len(explanation) < 10:
                explanation = response.replace("```" + improved_code + "```", "").strip()
        else:
            # No code blocks found, use a heuristic approach
            lines = response.split("\n")
            in_code = False
            code_lines = []
            explanation_lines = []
            
            for line in lines:
                if line.strip().startswith("```"):
                    in_code = not in_code
                elif in_code:
                    code_lines.append(line)
                else:
                    explanation_lines.append(line)
            
            improved_code = "\n".join(code_lines)
            explanation = "\n".join(explanation_lines)
    
    except Exception as e:
        logger.error(f"Error parsing Gemini response: {str(e)}")
        # Fallback to returning the whole response as explanation
        explanation = response
    
    # Convert explanation to HTML format with bullet points
    explanation = format_explanation_as_html(explanation)
    
    # If all else fails, return the full response as both code and explanation
    if not improved_code and not explanation:
        improved_code = response
        explanation = f"<p>{response}</p>"
        
    return improved_code, explanation

def format_explanation_as_html(explanation: str) -> str:
    """
    Format the explanation as HTML with bullet points if possible.
    
    Args:
        explanation: The textual explanation
        
    Returns:
        HTML formatted explanation
    """
    lines = explanation.split("\n")
    html_lines = []
    
    in_list = False
    for line in lines:
        stripped = line.strip()
        
        # Skip empty lines
        if not stripped:
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            html_lines.append("<br>")
            continue
            
        # Check for bullet points
        if stripped.startswith(("- ", "* ", "• ")):
            if not in_list:
                html_lines.append("<ul>")
                in_list = True
            item_content = stripped[2:].strip()
            html_lines.append(f"<li>{item_content}</li>")
        else:
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            html_lines.append(f"<p>{stripped}</p>")
    
    if in_list:
        html_lines.append("</ul>")
        
    return "".join(html_lines) 
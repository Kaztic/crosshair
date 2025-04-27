import os
import google.generativeai as genai
from dotenv import load_dotenv
import logging
import difflib
from typing import Tuple, Dict, Any, List

from app.models import DiffInfo

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

# Function to generate diff between original and improved code
def generate_diff_info(original_code: str, improved_code: str) -> DiffInfo:
    """
    Generate diff information between original and improved code
    
    Args:
        original_code: The original code
        improved_code: The improved code
        
    Returns:
        DiffInfo object with additions, deletions, changes and diff
    """
    original_lines = original_code.splitlines()
    improved_lines = improved_code.splitlines()
    
    # Generate unified diff
    diff_generator = difflib.unified_diff(
        original_lines, 
        improved_lines,
        fromfile='original',
        tofile='improved',
        lineterm=''
    )
    
    diff_text = '\n'.join(diff_generator)
    
    # Count additions, deletions and changes
    additions = 0
    deletions = 0
    changes = 0
    
    for line in diff_text.splitlines():
        if line.startswith('+') and not line.startswith('+++'):
            additions += 1
        elif line.startswith('-') and not line.startswith('---'):
            deletions += 1
    
    # Heuristic for changes: min of additions and deletions
    # This assumes that changed lines appear as a deletion followed by an addition
    changes = min(additions, deletions)
    additions -= changes
    deletions -= changes
    
    return DiffInfo(
        additions=additions,
        deletions=deletions,
        changes=changes,
        diff=diff_text
    )

async def generate_code(prompt: str, whole_file: bool = False):
    """
    Use Google Gemini API to generate code from scratch based on the user's prompt.
    
    Args:
        prompt: The user's instructions for what code to generate
        whole_file: Whether to generate a complete file
        
    Returns:
        A tuple of (generated_code, explanation, diff_info)
    
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
        system_prompt = """You are an expert game developer and programming mentor specialized in multiple languages including C++, C#, Python, and JavaScript. 
You excel at writing comprehensive, accurate code that follows modern practices, handles edge cases properly, and is well-structured.

Your responses should demonstrate:
1. Deep understanding of language-specific best practices and common patterns
2. Thorough implementation that handles edge cases and error conditions
3. Accurate syntax and semantics that will compile and run without errors
4. Appropriate use of data structures and algorithms
5. Clear organization with proper encapsulation and proper object-oriented design
6. Memory management appropriate for the language (manual in C++, garbage collection in others)
7. Proper type handling and validation
8. Complete implementations rather than partial pseudo-code

When writing C++ game code specifically:
- Use modern C++ features (C++11/14/17/20) appropriately
- Include proper header guards or #pragma once
- Handle memory management carefully (prefer smart pointers over raw pointers)
- Distinguish between .h/.hpp and .cpp files correctly when needed
- Include necessary standard library headers
- Use appropriate access modifiers (public/private/protected)
- Implement proper constructors, destructors, and rule-of-five/zero when needed
- Provide complete class implementations, not just interfaces
"""

        if whole_file:
            system_prompt += """
Return the complete file with all the required code.
The code should be properly formatted, complete, and ready to use without modification.
Always put the generated code inside ```code blocks```.
After the code block, provide a clear, detailed explanation of the implementation.
"""
        else:
            system_prompt += """
Return the generated code using the following format:
```1:1:filename
your generated code
```

For example, if you generate code for a player class in C++, format your response like this:
```1:1:player.h
#pragma once
// The generated header code for player.h
```

```1:1:player.cpp
#include "player.h"
// The generated implementation code for player.cpp
```

If you're generating multiple files, use separate code blocks with appropriate filenames.
Always include filename in your code blocks.
After the code blocks, provide a clear, detailed explanation of the implementation.
"""
        
        user_content = f"""I need you to generate code according to this prompt:

Instructions: {prompt}

Please generate high-quality, clean, well-documented, and COMPLETE code that will work correctly without modifications.
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
        
        # For generated code, there's no original to compare with
        diff_info = None
        
        return generated_code, explanation, diff_info
    
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

async def improve_code(code: str, prompt: str, whole_file: bool = False):
    """
    Use Google Gemini API to improve the code based on the user's prompt.
    
    Args:
        code: The original code to improve
        prompt: The user's instructions for how to improve the code
        whole_file: Whether to treat the code as a complete file
        
    Returns:
        A tuple of (improved_code, explanation, diff_info)
    
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
        system_prompt = """You are an expert game developer and programming mentor specialized in multiple languages including C++, C#, Python, and JavaScript. 
You excel at improving code to make it more efficient, readable, maintainable, and correct.

When improving code, ensure you:
1. Fix any syntax errors or bugs in the original code
2. Improve the implementation to handle edge cases and error conditions
3. Refactor for better performance, readability, and maintainability
4. Apply language-specific best practices and design patterns
5. Maintain or improve the existing architecture unless explicitly asked to change it
6. Add or improve comments and documentation where necessary
7. Ensure the code is complete and will run correctly without additional modifications

When improving C++ game code specifically:
- Use modern C++ features (C++11/14/17/20) where appropriate
- Fix memory management issues (use smart pointers where appropriate)
- Improve const-correctness and access modifiers
- Fix inheritance issues or object-oriented design problems
- Ensure proper initialization of variables and prevent undefined behavior
- Add appropriate error handling and input validation
- Maintain header/implementation separation if present in the original
"""

        if whole_file:
            system_prompt += """
You should return the entire improved file with all changes applied.
Make the necessary changes to fulfill the user's request and fix any other issues you identify.
Always put the improved code inside ```code blocks```.
After the code block, provide a clear, detailed explanation of what you changed and why.
"""
        else:
            system_prompt += """
When making changes to the code, use the following format to provide precise line edits:
```startLine:endLine:filepath
replacement code
```

For example, if you want to replace lines 10-12 in a file called "player.cpp", format your response like this:
```10:12:player.cpp
// The new code that should replace lines 10-12
```

If your changes affect multiple disconnected regions of the file, use multiple code blocks with the line specifications.
Always include line numbers in your code blocks.
After the code blocks, provide a clear, detailed explanation of the changes.
"""
        
        user_content = f"""Here is the code I want to improve:

```
{code}
```

Instructions: {prompt}

Please improve this code according to the instructions. 
The improved code should be complete, correct, and follow best practices for the programming language.
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
        
        # Generate diff information if whole file mode is enabled
        diff_info = None
        if whole_file:
            diff_info = generate_diff_info(code, extract_code_from_blocks(improved_code))
            logger.info(f"Generated diff info: +{diff_info.additions}, -{diff_info.deletions}, ~{diff_info.changes}")
        
        return improved_code, explanation, diff_info
    
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

def extract_code_from_blocks(text: str) -> str:
    """
    Extract code from code blocks in the text
    
    Args:
        text: Text containing code blocks
        
    Returns:
        The code inside the first code block
    """
    parts = text.split("```")
    
    if len(parts) >= 3:
        # Take the content of the first code block
        code_block = parts[1].strip()
        
        # Check if first line looks like a language name or specification
        lines = code_block.split("\n", 1)
        if len(lines) > 1 and (not lines[0].strip().startswith(" ") or ":" in lines[0]):
            # Skip the first line if it's a language name or specification
            return lines[1]
        
        return code_block
    
    return text  # Fallback to the original text if no code blocks found

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
        # Try to extract code blocks in the format ```startLine:endLine:filepath\ncode```
        code_blocks = []
        parts = response.split("```")
        
        for i in range(1, len(parts), 2):
            # Check if we have valid index and the part might be a code block
            if i < len(parts):
                code_block = parts[i].strip()
                
                # Check if it has a line specification in the first line
                code_lines = code_block.split("\n", 1)
                line_spec = ""
                
                # Format looks like "startLine:endLine:filepath"
                if len(code_lines) > 0 and ":" in code_lines[0]:
                    line_spec_parts = code_lines[0].split(":")
                    # If it has at least two colons, it's likely a line specification
                    if len(line_spec_parts) >= 3:
                        # Extract the line specification
                        line_spec = code_lines[0]
                        # The rest is the actual code
                        if len(code_lines) > 1:
                            actual_code = code_lines[1]
                        else:
                            actual_code = ""
                            
                        # Add the code block with its specification
                        code_blocks.append({
                            "spec": line_spec,
                            "code": actual_code
                        })
                        continue
                
                # If no line specification found, treat as a regular code block
                # Check if first line might be a language name and strip it if needed
                if len(code_lines) > 1 and not code_lines[0].startswith(" ") and len(code_lines[0].split()) <= 2:
                    code_content = code_lines[1]
                else:
                    code_content = code_block
                    
                # Add as a regular code block (without line specification)
                code_blocks.append({
                    "spec": "",
                    "code": code_content
                })
        
        # Format the improved code with line specifications
        if code_blocks:
            # Join the code blocks with their line specifications
            formatted_blocks = []
            for block in code_blocks:
                if block["spec"]:
                    formatted_blocks.append(f"```{block['spec']}\n{block['code']}```")
                else:
                    formatted_blocks.append(f"```\n{block['code']}```")
            
            improved_code = "\n\n".join(formatted_blocks)
            
            # Extract explanation from the text outside code blocks
            explanation_parts = []
            for i in range(0, len(parts), 2):
                explanation_parts.append(parts[i])
            
            explanation = "\n".join(explanation_parts).strip()
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
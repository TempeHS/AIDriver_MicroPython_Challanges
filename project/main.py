#  STUDENTS SHOULD ONLY EDIT THE FILE NAME IN LINE 7
import sys
from machine import Pin


# File name of the script to import
file_name = "v01"

# Add the path to the sys.path
sys.path.append("/py_scripts")

# Create a stop pin to stop the main loop
stop_pin = Pin(4, Pin.IN, Pin.PULL_UP)


# Create a callback function to stop the main loop when the stop pin is pressed
def callback(stop_pin):
    raise KeyboardInterrupt("Stop pin button pressed")


# Add an interrupt to the stop pin
stop_pin.irq(trigger=Pin.IRQ_FALLING, handler=callback)

# Import the v01.py script and setup exception handling
try:
    __import__(file_name)
except KeyboardInterrupt:
    print("KEYBOARD INTERRUPT")
except ImportError as e:
    print("IMPORT ERROR")
    print(
        "Raised when the import statement has trouble trying to load a library or module. A common issue is that the module does not exist."
    )
    print(
        "Check that the module/import exists in MicroPython or that you have added the library to the 'lib' folder"
    )
    print("--- Traceback ---")
    sys.print_exception(e)
except NameError as e:
    print("NAME ERROR")
    print(
        "Raised when a local or global name is not found. This is usually a typo in the name of a variable, method or function."
    )
    print(
        "Check the names of all variables, methods and functions have been typed correctly."
    )
    print("--- Traceback ---")
    sys.print_exception(e)
except SyntaxError as e:
    print("SYNTAX ERROR")
    print(
        "Raised when the parser encounters a syntax error. This may be caused by a typo in the code."
    )
    print(
        "Check the white space, colons, brackets and other syntax elements are correct in the code."
    )
    print("--- Traceback ---")
    sys.print_exception(e)
except TypeError as e:
    print("TYPE ERROR")
    print(
        "Raised when an operation or function is applied to an object of inappropriate type. The associated value is a string giving details about the type mismatch."
    )
    print("Check you are performing the correct processing for the data type.")
    print("--- Traceback ---")
    sys.print_exception(e)
except ValueError as e:
    print("VALUE ERROR")
    print(
        "Raised when a built-in operation or function receives an argument that has the right type but an inappropriate value."
    )
    print("--- Traceback ---")
    sys.print_exception(e)
except OSError as e:
    print("OS ERROR")
    print("This is a system error catch all.")
    print("You may want to check the error code or take this error to your teacher.")
    print("--- Traceback ---")
    sys.print_exception(e)
except RuntimeError as e:
    print("RUNTIME ERROR")
    print("This is a runtime catch all error.")
    print("You may want to check the error code or take this error to your teacher.")
    print("--- Traceback ---")
    sys.print_exception(e)
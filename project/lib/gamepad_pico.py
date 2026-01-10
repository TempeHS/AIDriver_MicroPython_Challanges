"""Legacy Dabble gamepad shim.

The classroom project has moved to the HM-10 Web Bluetooth controller. This
module remains only so that older student scripts raise an informative error
instead of failing with an ``ImportError``. Encourage students to update their
code to::

    from hm10_controller import HM10Controller
    from gamepad_driver_controller import HM10AIDriverController

"""


class GamePad:  # pragma: no cover - shim for legacy imports
    def __init__(self, *args, **kwargs):
        raise RuntimeError(
            "The Dabble-based GamePad has been retired. "
            "Use HM10Controller instead."
        )

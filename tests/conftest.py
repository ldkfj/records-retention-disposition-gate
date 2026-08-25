"""Windows-only workaround for genlayer-test 0.29.2 stdin temp cleanup
and dynamic vm._datetime synchronization for direct contract calls.
"""

import functools
import os
import sys
import tempfile

_STDIN_TEMP_FILES = []


def pytest_configure():
    from gltest.direct import loader, wasi_mock

    if sys.platform == "win32":
        def inject_message_to_fd0(vm):
            from genlayer.py import calldata
            from genlayer.py.types import Address

            def address(value):
                return Address(value) if isinstance(value, bytes) else value

            encoded = calldata.encode(
                {
                    "contract_address": address(vm._contract_address),
                    "sender_address": address(vm.sender),
                    "origin_address": address(vm.origin),
                    "stack": [],
                    "value": vm._value,
                    "datetime": vm._datetime,
                    "is_init": False,
                    "chain_id": vm._chain_id,
                    "entry_kind": 0,
                    "entry_data": b"",
                    "entry_stage_data": None,
                }
            )
            fd, path = tempfile.mkstemp()
            _STDIN_TEMP_FILES.append(path)
            try:
                os.write(fd, encoded)
                os.lseek(fd, 0, os.SEEK_SET)
                if getattr(vm, "_original_stdin_fd", None) is None:
                    vm._original_stdin_fd = os.dup(0)
                os.dup2(fd, 0)
            finally:
                os.close(fd)

        loader._inject_message_to_fd0 = inject_message_to_fd0

    # Ensure proxy calls sync dynamic vm._datetime to gl.message_raw
    orig_make_contract_proxy = loader._make_contract_proxy

    orig_load_module = loader._load_module

    def patched_load_module(contract_path):
        try:
            import genlayer.gl.genvm_contracts as ggc
            ggc.__known_contract__ = None
        except Exception:  # noqa: BLE001, S110
            pass
        return orig_load_module(contract_path)

    loader._load_module = patched_load_module

    def patched_make_contract_proxy(instance):
        proxy = orig_make_contract_proxy(instance)
        orig_getattr = type(proxy).__getattr__

        def custom_getattr(self, name):
            attr = orig_getattr(self, name)
            if callable(attr):
                @functools.wraps(attr)
                def syncing_wrapper(*args, **kwargs):
                    try:
                        from genlayer import gl
                        current_vm = wasi_mock.get_vm()
                        if (
                            current_vm is not None
                            and hasattr(current_vm, "_datetime")
                            and hasattr(gl, "message_raw")
                            and isinstance(gl.message_raw, dict)
                        ):
                            gl.message_raw["datetime"] = current_vm._datetime
                    except Exception:  # noqa: BLE001, S110
                        pass
                    return attr(*args, **kwargs)
                return syncing_wrapper
            return attr

        type(proxy).__getattr__ = custom_getattr
        return proxy

    loader._make_contract_proxy = patched_make_contract_proxy


def pytest_sessionfinish():
    for path in _STDIN_TEMP_FILES:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass

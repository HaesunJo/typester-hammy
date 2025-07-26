{
  "targets": [
    {
      "target_name": "keyboard_native",
      "sources": [
        "bindings/keyboard-native.cc",
        "common/keyboard-base.cc"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "common/",
        "platform/",
        "bindings/"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "conditions": [
        [
          "OS=='mac'",
          {
            "sources": [
              "platform/macos/keyboard-macos.cc",
              "platform/macos/permissions-macos.cc"
            ],
            "link_settings": {
              "libraries": [
                "-framework ApplicationServices",
                "-framework Carbon",
                "-framework CoreFoundation"
              ]
            },
            "xcode_settings": {
              "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
              "CLANG_CXX_LIBRARY": "libc++",
              "MACOSX_DEPLOYMENT_TARGET": "10.9"
            }
          }
        ],
        [
          "OS=='win'",
          {
            "sources": [
              "platform/windows/keyboard-windows.cc",
              "platform/windows/permissions-windows.cc"
            ],
            "libraries": [
              "user32.lib",
              "advapi32.lib"
            ],
            "msvs_settings": {
              "VCCLCompilerTool": {
                "ExceptionHandling": 1
              }
            }
          }
        ],
        [
          "OS=='linux'",
          {
            "sources": [
              "platform/linux/keyboard-linux.cc",
              "platform/linux/permissions-linux.cc"
            ],
            "libraries": [
              "-lX11",
              "-lXtst",
              "-lXext",
              "-lXi"
            ],
            "cflags": [
              "<!@(pkg-config --cflags x11 xtst xi)"
            ],
            "ldflags": [
              "<!@(pkg-config --libs x11 xtst xi)"
            ]
          }
        ]
      ]
    }
  ]
}
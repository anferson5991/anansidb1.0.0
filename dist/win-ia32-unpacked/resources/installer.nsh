!define vendordir "${BUILD_RESOURCES_DIR}\resources"

!macro customInstall
  ExecWait '"${vendordir}\anansi.exe"'
!macroend

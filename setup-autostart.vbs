Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

Dim taskXML
taskXML = "<?xml version=""1.0"" encoding=""UTF-16""?>" & vbCrLf & _
"<Task version=""1.2"" xmlns=""http://schemas.microsoft.com/windows/2004/02/mit/task"">" & vbCrLf & _
"  <Triggers>" & vbCrLf & _
"    <LogonTrigger><Enabled>true</Enabled></LogonTrigger>" & vbCrLf & _
"  </Triggers>" & vbCrLf & _
"  <Settings>" & vbCrLf & _
"    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>" & vbCrLf & _
"    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>" & vbCrLf & _
"    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>" & vbCrLf & _
"    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>" & vbCrLf & _
"    <Enabled>true</Enabled>" & vbCrLf & _
"  </Settings>" & vbCrLf & _
"  <Actions>" & vbCrLf & _
"    <Exec>" & vbCrLf & _
"      <Command>C:\Users\Asus\Desktop\junior code project\Warehouse\start-server.bat</Command>" & vbCrLf & _
"    </Exec>" & vbCrLf & _
"  </Actions>" & vbCrLf & _
"</Task>"

Dim xmlPath
xmlPath = "C:\Users\Asus\Desktop\junior code project\Warehouse\task.xml"

Dim objFile
Set objFile = objFSO.CreateTextFile(xmlPath, True, True)
objFile.Write taskXML
objFile.Close

Dim result
result = objShell.Run("schtasks /create /tn ""WarehouseApp"" /xml """ & xmlPath & """ /f", 0, True)

If result = 0 Then
    MsgBox "SUCCESS! The Warehouse server will now start automatically every time you log in to Windows." & vbCrLf & vbCrLf & "Open your browser at: http://127.0.0.1:8000", vbInformation, "Warehouse App - Auto Start Configured"
Else
    MsgBox "Setup failed (error " & result & "). Please right-click setup-autostart.vbs and choose 'Run as administrator'.", vbCritical, "Setup Failed"
End If

objFSO.DeleteFile xmlPath, True

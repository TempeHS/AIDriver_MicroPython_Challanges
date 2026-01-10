- Fix BT

1.  Library: https://github.com/STEMpedia/Dabble
2.  Docs:
<p><a href="https://ai.thestempedia.com/docs/dabble-app/">Dabble App - Documentation</a></p>
<ol>
  <li>
    <a href="https://ai.thestempedia.com/docs/dabble-app/getting-started-with-dabble/">Getting Started with Dabble</a>
  </li>
  <li>
    <a href="https://ai.thestempedia.com/docs/pictoblox/arduino-uno-with-pictoblox/interface-dabble-project-making-app-with-arduino-using-pictoblox/">Interface Dabble with Arduino</a>
  </li>
  <li>
    <a href="https://ai.thestempedia.com/docs/evive/evive-tutorials/interfacing-dabble-with-evive/">Interface Dabble with evive</a>
  </li>
  <li>
    <a href="https://ai.thestempedia.com/docs/dabble-app/">Dabble App Modules</a>
    <ol>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/led-brightness-control-module/">LED Brightness Control Module</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/terminal-module/">Terminal Module</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/gamepad-module/">Gamepad Module</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/pin-state-monitor-module/">Pin State Monitor Module</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/motor-control-module/">Motor Control Module</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/input-module/">Input Module</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/camera-module-camera-video/">Camera Module - Image & Video</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/color-detector/">Color Detector</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/phone-sensors-module/">Phone Sensors Module</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/iot-module-data-logger/">Data Logger Module</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/music-module/">Music Module</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/iot-module-notification/">IoT Module - Notification</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/oscilloscope-module/">Oscilloscope Module</a>
      </li>
      <li>
        <a href="https://ai.thestempedia.com/docs/dabble-app/iot-module-internet/">IoT Module - Internet</a>
      </li>
    </ol>
  </li>
  <li>
    <a href="https://ai.thestempedia.com/docs/dabble-app/troubleshooting-guide-for-dabble-app/">Troubleshooting Guide for Dabble App</a>
  </li>
</ol>
<h1>Getting Started with Dabble</h1>
<p><img width="600" height="372" src="https://ai.thestempedia.com/wp-content/uploads/2022/08/Dabble.jpg" alt="Dabble"></p>
<p>Description</p>
<p>Learn how to get started with the Dabble App to transform your Smartphone into a virtual I/O device and control hardware using Bluetooth, communicate with it, and access sensors like accelerometer, GPS, proximity, and other features.</p>
<ul>
  <li><strong>Software Used:</strong> PictoBlox, Arduino IDE</li>
  <li><strong>Difficulty Level:</strong> Beginners</li>
  <li>
    <strong>Category:</strong> <a href="https://ai.thestempedia.com/docs-category/dabble-app/dabble-tutorials/">Dabble Tutorials</a>, <a href="https://ai.thestempedia.com/docs-category/getting-started/">Getting Started</a>, <a href="https://ai.thestempedia.com/docs-category/tutorial/">Tutorial</a>
  </li>
</ul>
<h2>Introduction</h2>
<p>Dabble App transforms your Smartphone into a virtual I/O device and lets you control hardware using Bluetooth, communicate with it, and access sensors like accelerometer, GPS, proximity, and other features of your Smartphone.</p>
<p>You can use Dabble as a Bluetooth Controller App for Arduino Uno-Mega-Nano, ESP32, and evive for making various DIY projects or IoT applications.</p>
<p><strong>You can write the program in Arduino IDE or PictoBlox (graphical programming based on Scratch 3.0). Examples of codes are also provided in the Arduino library of Dabble.</strong></p>
<p>This getting started guide will help you to understand the required hardware/modules, wiring diagram, connecting the board/Bluetooth module with mobile, and how to use Dabble library/extension.</p>
<p><a href="https://ai.thestempedia.com/wp-content/uploads/2022/08/Home_disconnected.jpg"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/Home_disconnected.jpg" alt="Dabble Home Disconnected" width="299" height="600"></a></p>
<table>
  <tr>
    <th>Sr.No</th>
    <th>Module Name</th>
    <th>Module Description</th>
  </tr>
  <tbody>
    <tr>
      <td>1</td>
      <td>LED Brightness Control</td>
      <td>Control brightness of LEDs.</td>
    </tr>
    <tr>
      <td>2</td>
      <td>Terminal</td>
      <td>Send and receive commands over Bluetooth.</td>
    </tr>
    <tr>
      <td>3</td>
      <td>GamePad</td>
      <td>Control devices in analog (Joystick), digital, and accelerometer mode.</td>
    </tr>
    <tr>
      <td>4</td>
      <td>Pin State Monitor</td>
      <td>Remotely monitor the live status of devices and debug them.</td>
    </tr>
    <tr>
      <td>5</td>
      <td>Motor Control</td>
      <td>Control actuators such as the DC motor and servo motor.</td>
    </tr>
    <tr>
      <td>6</td>
      <td>Inputs</td>
      <td>Provide analog and digital inputs via buttons, knobs, and switches.</td>
    </tr>
    <tr>
      <td>7</td>
      <td>Camera</td>
      <td>Use the camera of your Smartphone for taking photos and videos, face recognition and color picking.</td>
    </tr>
    <tr>
      <td>8</td>
      <td>Phone Sensor</td>
      <td>Access different sensors of your Smartphone such as the accelerometer, gyroscope, proximity sensor, magnetometer, light meter, sound meter, GPS, temperature sensor, and barometer to make projects and conduct experiments.</td>
    </tr>
    <tr>
      <td>9</td>
      <td>Oscilloscope</td>
      <td>Visualize and analyze the input and output signals given to the device using the oscilloscope module.</td>
    </tr>
    <tr>
      <td>10</td>
      <td>IoT</td>
      <td>Make the Internet of Things possible.</td>
    </tr>
    <tr>
      <td>11</td>
      <td>Music</td>
      <td>Receive commands from the device and play tones, songs, or other recorded files on your Smartphone.</td>
    </tr>
  </tbody>
</table>
<h3>Supported Development Boards</h3>
<p>Dabble is compatible with the following prototyping boards:</p>
<ol>
  <li>evive</li>
  <li>Arduino boards like Mega, Uno, and Nano</li>
  <li>Esp32 (ESP-WROOM-32, ESP32 development board, etc.)</li>
</ol>
<h3>Supported Bluetooth Modules</h3>
<p>HC-05, HC-06, HM-10, and AT-09 are the supported Bluetooth modules with evive and other Arduino boards. Hence hardware libraries and scratch extensions are developed as per the behavior of these modules. Brief descriptions of these modules are given in the table below:</p>
<table>
  <tr>
    <th>Bluetooth Module</th>
    <th>It's working</th>
  </tr>
  <tbody>
    <tr>
      <td>HC-05</td>
      <td>It is a Serial Port Protocol Bluetooth working on Bluetooth protocol "Bluetooth V2.0+EDR".</td>
    </tr>
    <tr>
      <td>HC-06</td>
      <td>This is also a Serial Bluetooth module with Bluetooth protocol "Bluetooth V2.0+EDR". It differs from HC-05 in terms of a few hardware configurations and a fact that it can only be used as a slave.</td>
    </tr>
    <tr>
      <td>HM-10</td>
      <td>It follows Bluetooth protocol BLE 4.0. Due to the low energy protocol data transfer rate on HM-10 is slower compared to HC-05 and HC-06.</td>
    </tr>
    <tr>
      <td>ESP32</td>
      <td>It is a low-power system on a chip microcontroller with dual-mode Bluetooth and integrated Wi-Fi. ESP32-WROOM-32, ESP32-WROVER, ESP32-DevKitC or any development board based on Espressif ESP32 will work with Dabble.</td>
    </tr>
  </tbody>
</table>
<p><img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/Notes.gif" alt="Notes" width="100" height="100"></p>
<p><strong>Note:</strong>  There are various clone modules available for HM-10. They may or may not perform properly with the app. Hence, if you are using HM-10, then make sure it is the original one.</p>
<h2>Hardware Setup</h2>
<p>The first and foremost thing is connecting the Bluetooth module to the development board.</p>
<p>A circuit diagram for connecting the Bluetooth module with different boards is given below. Choose the board with which you want to set up your Dabble app.</p>
<p>Diagrams mainly show setup with HC-05 however same pin connection setup goes for HM-10 and HC-06.</p>
<h3>evive</h3>
<p><strong>Components Required</strong></p>
<ol>
  <li>evive</li>
  <li>HC05 Module</li>
</ol>
<p><strong>Circuit Diagram</strong></p>
<p>You have to connect the HC05 Bluetooth module to evive' Bluetooth headers in the following way:</p>
<p><a href="https://ai.thestempedia.com/wp-content/uploads/2022/08/eviveAppBT.jpg"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/eviveAppBT.jpg" alt="eviveAppBT" width="409" height="506"></a></p>
<h3>Arduino Uno</h3>
<p><strong>Components Required</strong></p>
<ol>
  <li>Arduino Uno</li>
  <li>HC05 Module</li>
  <li>Jumper Cable - Male to Female</li>
</ol>
<p><strong>Circuit Diagram</strong></p>
<p>You have to connect the HC05 Bluetooth module to Arduino Uno in the following way:</p>
<ol>
  <li>GND of HC05 to GND of Arduino Uno</li>
  <li>VCC of HC05 to 5V of Arduino Uno</li>
  <li>TX of HC05 to Digital Pin 2 of Arduino Uno</li>
  <li>RX of HC05 to Digital Pin 3 of Arduino Uno</li>
</ol>
<p><a href="https://ai.thestempedia.com/wp-content/uploads/2022/08/UnoAppBT.jpg"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/UnoAppBT.jpg" alt="UnoAppBT" width="433" height="358"></a></p>
<h3>Arduino Mega</h3>
<p><strong>Components Required</strong></p>
<ol>
  <li>Arduino Mega 2560</li>
  <li>HC05 Module</li>
  <li>Jumper Cable - Male to Female</li>
</ol>
<p><strong>Circuit Diagram</strong></p>
<p>You have to connect the HC05 Bluetooth module to Arduino Mega in the following way:</p>
<ol>
  <li>GND of HC05 to GND of Arduino Mega</li>
  <li>VCC of HC05 to 5V of Arduino Mega</li>
  <li>TX of HC05 to Digital Pin 15 of Arduino Mega</li>
  <li>RX of HC05 to Digital Pin 14 of Arduino Mega</li>
</ol>
<p><a href="https://ai.thestempedia.com/wp-content/uploads/2022/08/MegaAppBT.jpg"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/MegaAppBT.jpg" alt="MegaAppBT" width="468" height="497"></a></p>
<h3>Arduino Nano</h3>
<p><strong>Components Required</strong></p>
<ol>
  <li>Arduino Nano</li>
  <li>HC05 Module</li>
  <li>Jumper Cable - Male to Female</li>
</ol>
<p><strong>Circuit Diagram</strong></p>
<p>You have to connect the HC05 Bluetooth module to Arduino Nano in the following way:</p>
<ol>
  <li>GND of HC05 to GND of Arduino Nano</li>
  <li>VCC of HC05 to 5V of Arduino Nano</li>
  <li>TX of HC05 to Digital Pin 2 of Arduino Nano</li>
  <li>RX of HC05 to Digital Pin 3 of Arduino Nano</li>
</ol>
<p><a href="https://ai.thestempedia.com/wp-content/uploads/2022/08/NanoAppBT.jpg"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/NanoAppBT.jpg" alt="NanoAppBT" width="600" height="594"></a></p>
<h3>ESP32</h3>
<p>ESP32 has onboard Bluetooth, that supports BT classic as well as Bluetooth Low Energy (BLE). Hence there is no need for any external hardware setup for Bluetooth on Esp32.</p>
<h2>Install Dabble in your Smartphone</h2>
<ol>
  <li>
    <strong>Android</strong>: Dabble is available for the Android user functioning on Android version 5.0.0 and above. Download <a href="https://play.google.com/store/apps/details?id=io.dabbleapp">here</a>.
  </li>
  <li>
    <strong>iOS</strong>: It is compatible with iPhone, iPad, and iPad touch and requires iOS 12.2 and above. Download <a href="https://apps.apple.com/us/app/dabble-bluetooth-controller/id1472734455">here</a>.
  </li>
</ol>
<p><img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/Notes.gif" alt="Notes" width="100" height="100"></p>
<p><strong>Note:</strong> Dabble app for iOS devices supports only Bluetooth Low Energy, hence you have to use BLE module HM-10 on your hardware while working with iOS devices.</p>
<h2>Connecting Dabble with Hardware</h2>
<p>After successfully installing the Dabble, follow the below guidelines for connecting Dabble with your Bluetooth module.</p>
<ol>
  <li>As soon as you open the app you can see a series of introduction slides appearing in your smartphone that gives you a brief overview of how to interact with Dabble. Go through them.</li>
  <li>Click on the Connect icon that appears at the top right corner of your screen beside the Settings icon. As soon as you click on the Connect icon a dialog box appears asking for permission of turning on location in your smartphone. Grant the location access permission and then follow the process as shown below:<img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/Dabble.gif" alt="Dabble Bluetooth Connection" width="320" height="642"></li>
  <li> In the above process, you can see the app was connected to Bluetooth named "evive". Similarly, you will be able to see the name of your Bluetooth module in the list.
    <p><img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/Notes.gif" alt="Notes" width="100" height="100"></p>
    <p><strong>Note:</strong> A dialog box asking for the Bluetooth password may appear. Enter your Bluetooth module password if you have kept any password or try some default passwords like 0000 or 1234 in the case of HC-05 and HC-06 and try 000000 or 123456 for HM-10.</p>
    <p><img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/Notes.gif" alt="Notes" width="100" height="100"></p>
    <p><strong>Note:</strong> If you are facing some trouble in connecting your module then first try to pair the module from your smartphone's Bluetooth settings. Follow the troubleshooting page for guidance.</p>
  </li>
  <li>As soon as the app is connected to your Bluetooth module you can see the notification in your smartphone telling you which board you have connected. <img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/Dabble-mockup-mobile_Arduino-Mega-Board.png" alt="Dabble-mockup-mobile_Arduino-Mega-Board" width="305" height="612"></li>
  <li>After reading notification go to the Settings icon in your app. You will be able to see information like your app version, hardware library version, and the name of the hardware board your smartphone is connected to.</li>
</ol>
<p>If you face any issues, visit the troubleshooting page of Dabble for a detailed solution to your problems.</p>
<h2>Programming the boards</h2>
<h3>Arduino IDE - For evive, Arduino Uno, Nano and Mega</h3>
<p>After successfully installing Dabble in your smartphone and pairing it with the Bluetooth module, it is now time to follow a few final steps for establishing communication between your smartphone and the hardware. For working with Dabble on Arduino IDE, you need to first install Dabble Arduino library for Arduino boards or DabbleESP32 library.</p>
<h4>Get Dabble Library for your Hardware</h4>
<p>You can get the Dabble library for Arduino IDE by clicking on this <a href="https://thestempedia.com/download/28488/">zip file</a>.</p>
<p>Now follow below-mentioned steps for adding Dabble library in Arduino Ide:</p>
<ol>
  <li>Open Arduino IDE and navigate to Sketch&gt;&gt;Include Library&gt;&gt; Add .ZIP library.<a href="https://ai.thestempedia.com/wp-content/uploads/2022/08/Library-Installation.png"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/Library-Installation.png" alt="Library-Installation" width="600" height="394"></a>
  </li>
  <li>A dialogue box as shown in the image below appears. Select your zip folder from the location where it was downloaded and then click "Open".</li>
  <li>
    <p>As soon as the library is installed you can see "Library added to your libraries. Check "Include library"menu." message at bottom of your Arduino IDE screen. <a href="https://ai.thestempedia.com/wp-content/uploads/2022/08/Zip-Added.png"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/Zip-Added.png" alt="Zip-Added" width="600" height="531"></a></p>
  </li>
</ol>
<h4>Flash code to your Board</h4>
<p>In this section, we will use a very basic "<strong>LED Brightness Control</strong>" module and control onboard led pin 13  present on evive and Arduino boards.</p>
<p>At first, let's look at the user interface of LED Brightness Control" present in your smartphone.</p>
<p>This module allows you to control the output of the digital pins in two ways:</p>
<ol>
  <li>If the pin is a digital pin with no PWM support, then you can control the HIGH and LOW state of the LED by clicking on the ON/OFF icon present in the center of the module.<a href="https://ai.thestempedia.com/wp-content/uploads/2022/07/LED-Brightness-value-100.jpg"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/LED-Brightness-value-100.jpg" alt="Dabble LED Brightness Value 100" width="299" height="600"></a>
  </li>
  <li>If the digital pin is a PWM pin, then you can also control the brightness of the LED, using the module. You can adjust the brightness value between 0 to 100 using the potentiometer type knob with the green bar as seen in the image.</li>
</ol>
<p>Since we are going to control LED pin 13 and it is a PWM pin hence we will be able to turn led ON/OFF and also vary its brightness with potentiometer knob.</p>
<ol>
  <li>Now navigate to "File&gt;Examples&gt;Dabble" there you can see the other three sub-folders namely "BluetoothBaudSettings", "evive" and "Uno_Nano_Mega".</li>
  <li>Depending upon your board type navigate to that subfolder there you can see "LedBrightnessControl" example open that example.<a href="https://ai.thestempedia.com/wp-content/uploads/2022/08/LedControl.png"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/LedControl.png" alt="LedControl" width="600" height="426"></a><img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/Notes.gif" alt="evive Notes Icon" width="80" height="80"> Before running this example code make sure that you know the baud rate of your Bluetooth module. If you don't know your Bluetooth module baud rate and are using the HC-05 module then go to "BluetoothBaudSettings" folder and open example code as per your board type and read Baud Settings of your Bluetooth module. <img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/Notes.gif" alt="evive Notes Icon" width="80" height="80"> Depending on board types default baud rate used in example codes is 115200 for evive and 9600 for Mega, Uno and Nano boards. If your current baud rate settings don't match these cases then at first change your baud rate to either of these values as per your board.
    <p>#define CUSTOM_SETTINGS #define INCLUDE_LEDCONTROL_MODULE #include &lt;evive.h&gt; #include &lt;Dabble.h&gt; void setup() { Serial.begin(250000); Dabble.begin(115200); //Enter baudrate of your bluetooth.Connect bluetooth on Bluetooth port present on evive. } void loop() { Dabble.processInput(); Serial.print("Led:"); Serial.print(LedControl.getpinNumber()); Serial.print('\t'); Serial.print("State:"); //0 if led is Off. 1 if led is On. Serial.print(LedControl.getpinState()); Serial.print('\t'); Serial.print("Brightness:"); Serial.println(LedControl.readBrightness()); }</p>
    <p>Arduino</p>
    <p>Copy</p>
  </li>
  <li>Upload the LedBrightnessControl code on your board. Now press ON/OFF button in LED Brightness Control Module to turn led on or off. And move the knob to vary the brightness of your Led.</li>
  <li>Also, you can open your serial monitor to see data like pin Number, Led State and Brightness control value transmitted from your smartphone.</li>
</ol>
<p><a href="https://ai.thestempedia.com/wp-content/uploads/2022/08/Ledbrightness.png"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/Ledbrightness.png" alt="Ledbrightness" width="600" height="337"></a></p>
<p>Now, let's look at the basic structure of the above-written code. There are four basic parts of your code namely - Header, Initialize Bluetooth communication, Refreshing Data, and Functions.  Codes for all the modules can be categorized in these parts.</p>
<h4>Header</h4>
<p>In this part, you define certain macros names depending upon which module you want to use. There are unique define terms(macro) made for each module. Go through all module examples to know them.</p>
<p>For example, to use the LED Control module in the Arduino program, you have to define the following header:</p>
<p>#define CUSTOM_SETTINGS</p>
<p>#define INCLUDE_LEDCONTROL_MODULE</p>
<p>After defining the above mention headers, you have to include the dabble library:</p>
<p>#include</p>
<h4>Enabling Bluetooth Communication</h4>
<p>To enable Bluetooth communication, you have to initialize serial communication using the following code:</p>
<p>Dabble.begin(Baud_Rate);</p>
<p>Here Baud_Rate is the baud rate set for the Bluetooth module. With evive, you normally get 115200 baud rate modules and for other boards Baud_Rate is set to 9600. You must keep your Bluetooth baud rate same as Baud_Rate.</p>
<h4>Refreshing the data</h4>
<p>To refresh the data that the device gets from the mobile app, you have to use the following line of code:</p>
<p>Dabble.processInput();</p>
<p>This function is included in the loop of each example code for processing the data obtained from your mobile.</p>
<p>In this example, this function changes the state and the brightness of the LED.</p>
<h4>Functions</h4>
<p>As shown in the example code it prints data like pin number, its state and brightness on Serial Monitor. For this it uses the following functions:</p>
<ol>
  <li><strong>LedControl.getpinNumber()</strong>: This function returns the pin selected for LED Brightness control in the mobile app. The function returns int data type.</li>
  <li>
    <strong>LedControl.getpinState()</strong>: The function returns the state of the pin set by the user in the mobile app. This function returns the following output:
    <ol>
      <li>1 if the state is set to ON</li>
      <li>0 if the state is set to OFF</li>
    </ol>
  </li>
  <li><strong>LedControl.readBrightness()</strong>: This function returns the brightness value set by the user in the mobile app. It returns int data type with a value ranging between 0 and 100.</li>
</ol>
<p>If you don't want to read data coming from your phone and just want to execute Led module functioning then you can avoid the use of these functions in your code.</p>
<p>This module also allows you to change pin which you are controlling. For this tap on the "Pin" button and write your desired pin number. You can also change brightness value by tapping on "Value" and entering the desired value.</p>
<h3>PictoBlox (Scratch) - For evive, ESP32, Arduino Uno, Nano, and Mega</h3>
<h4>Enabling Dabble Extension in PictoBlox</h4>
<ol>
  <li>Open PictoBlox.</li>
  <li>Go to the board menu and select the appropriate board for your project. <img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/PictobloxBoardSelection.png" alt="Pictoblox Board Selection" width="600" height="243"></li>
  <li>Click on add extension on the left bottom corner. A new window will open showing all the extensions. Select the Dabble extension. <img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/Load-Extensions.png" alt="Load Extensions" width="600" height="309"></li>
</ol>
<p>New blocks will come in the block palette for the Dabble App: <a href="https://ai.thestempedia.com/extension/dabble/">https://ai.thestempedia.com/extension/dabble/</a></p>
<p>You can work on two modes in Pictoblox while using Dabble App:</p>
<ol>
  <li><strong>Stage Mode:</strong> In this mode, you can write scripts for the sprite and board and control it in real time. If you disconnect the board, you cannot control it anymore.</li>
  <li><strong>Upload Mode:</strong> This mode allows you to write scripts and upload them to your board so that you can control even when it is not connected t your PC/laptop.</li>
</ol>
<h4>Example - Enabling LED Control</h4>
<p>In this section, we will use a very basic "LED Brightness Control" module and control onboard led pin 13  present on evive or Arduino boards.</p>
<p>At first, let's look at the user interface of LED Brightness Control" present in your smartphone.</p>
<p>This module allows you to control the output of the digital pins in two ways:</p>
<ol>
  <li>If the pin is a digital pin with no PWM support, then you can control the HIGH and LOW state of the LED by clicking on the ON/OFF icon present in the centre of the module. <a href="https://ai.thestempedia.com/wp-content/uploads/2022/08/LED-Brightness-value-0.jpg"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/LED-Brightness-value-0.jpg" alt="Dabble LED Brightness Value 0" width="299" height="600"></a>LED Brightness module controlling digital pin 13. The current state of LED is set to OFF. <a href="https://ai.thestempedia.com/wp-content/uploads/2022/07/LED-Brightness-value-100.jpg"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/LED-Brightness-value-100.jpg" alt="Dabble LED Brightness Value 100" width="299" height="600"></a>LED Brightness module controlling digital pin 13. The current state of LED is set to ON.
  </li>
  <li>If the digital pin is a PWM pin, then you can also control the brightness of the LED, using the module. You can adjust the brightness value between 0 to 100 using the potentiometer type knob with the green bar as seen in the image.</li>
</ol>
<p>Make the following program to enable LED control:</p>
<p><img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/Enable-LED-control-example.png" alt="Enable LED control example" width="161" height="142"></p>
<p>Switch to the Upload mode, by clicking on the toggle switch right above the stage.<a href="https://ai.thestempedia.com/wp-content/uploads/2022/08/6.UplaodModePictoblox.png"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/6.UplaodModePictoblox.png" alt="PictoBlox Mode Select" width="610" height="197"></a></p>
<p>On doing so, the Arduino code will appear instead of the stage. In the Upload mode, there are three buttons replace the green flag and red octagon from the Stage mode. The second button is to upload the code to evive. Click on the button and upload the code.</p>
<p><a href="https://ai.thestempedia.com/wp-content/uploads/2022/07/Upload-Code-Button.png"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/Upload-Code-Button.png" alt="PictoBlox Upload Code Button" width="383" height="142"></a></p>
<p>Connect your app and control the LED.</p>
<h3>Arduino IDE - For ESP32</h3>
<p>This section will guide you on using Gamepad module of Dabble with ESP32. You can download  library <a href="https://thestempedia.com/download/24469/">Dabble-ESP32</a> for working with different Dabble modules. For working on ESP32 with Arduino IDE you first have to install ESP32 board on Arduino IDE. If you don't know anything about ESP32 board installation then first refer <a href="https://thestempedia.com/tutorials/getting-started-with-esp32-on-arduino-ide/">getting started with ESP32. </a></p>
<p><a href="https://ai.thestempedia.com/wp-content/uploads/2022/07/Game-Pad_Connected-e1545981977305.png"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/07/Game-Pad_Connected-e1545981977305.png" alt="Game Pad_Connected" width="600" height="299"></a></p>
<p>The image above shows Digital Mode of Gamepad Module. There are two more modes present in this module. You can go to the Gamepad module description to explore more about it.</p>
<p>Add the downloaded zip file of the library to Arduino IDE. To learn how to add zip file of the library to Arduino IDE follow this link. After successfully installing library go to "File&gt;Examples&gt;DabbleESP32&gt;03.Gamepad".</p>
<h4><strong>Functions</strong></h4>
<p>begin(Bluetooth_Name) -   initializes  BLE(Bluetooth Low Energy) on ESP32 with the name written in place of  "Bluetooth_Name".</p>
<p>processInput() - This function should be continuously called in the loop to refresh data received from Dabble app.</p>
<table>
  <tr>
    <th>Function</th>
    <th>Return Type</th>
    <th>Function Brief Description</th>
    <th>Returning Value</th>
  </tr>
  <tbody>
    <tr>
      <td>isUpPressed()</td>
      <td>Boolean</td>
      <td>The function tells whether the Up button is pressed or not.</td>
      <td>1 when Up button is pressed; 0 when Up button is not pressed.</td>
    </tr>
    <tr>
      <td>isDownPressed()</td>
      <td>Boolean</td>
      <td>The function tells whether the Down button is pressed or not.</td>
      <td>1 when Down button is pressed; 0 when Down button is not pressed.</td>
    </tr>
    <tr>
      <td>isLeftPressed()</td>
      <td>Boolean</td>
      <td>The function tells whether the Left button is pressed or not.</td>
      <td>1 when Left button is pressed; 0 when Left button is not pressed.</td>
    </tr>
    <tr>
      <td>isRightPressed()</td>
      <td>Boolean</td>
      <td>The function tells whether the Right button is pressed or not.</td>
      <td>1 when Right button is pressed; 0 when Right button is not pressed.</td>
    </tr>
    <tr>
      <td>isTrianglePressed()</td>
      <td>Boolean</td>
      <td>The function tells whether the Triangle button is pressed or not.</td>
      <td>1 when Triangle button is pressed; 0 when Triangle button is not pressed.</td>
    </tr>
    <tr>
      <td>isCirclePressed()</td>
      <td>Boolean</td>
      <td>The function tells whether the Circle button is pressed or not.</td>
      <td>1 when Circle button is pressed; 0 when Circle button is not pressed.</td>
    </tr>
    <tr>
      <td>isCrossPressed()</td>
      <td>Boolean</td>
      <td>The function tells whether the Cross button is pressed or not.</td>
      <td>1 when Cross button is pressed; 0 when Cross button is not pressed.</td>
    </tr>
    <tr>
      <td>isSquarePressed()</td>
      <td>Boolean</td>
      <td>The function tells whether the Square button is pressed or not.</td>
      <td>1 when Square button is pressed; 0 when Square button is not pressed.</td>
    </tr>
    <tr>
      <td>isStartPressed()</td>
      <td>Boolean</td>
      <td>The function tells whether the Start button is pressed or not.</td>
      <td>1 when Start button is pressed; 0 when Start button is not pressed.</td>
    </tr>
    <tr>
      <td>isSelectPressed()</td>
      <td>Boolean</td>
      <td>The function tells whether the Select button is pressed or not.</td>
      <td>1 when Select button is pressed; 0 when Select button is not pressed.</td>
    </tr>
    <tr>
      <td>getAngle()</td>
      <td>Integer</td>
      <td>This function returns the angle value between the x-axis and the line joining the dot and the center of the joystick.</td>
      <td>The value varies from 0 to 360 degrees with a step of 15 degrees.</td>
    </tr>
    <tr>
      <td>getRadius()</td>
      <td>Integer</td>
      <td>The function returns the distance between the center of the joystick and the dot.</td>
      <td>The value varies from 0 to 7.</td>
    </tr>
    <tr>
      <td>getXaxis()</td>
      <td>float</td>
      <td>The function returns the x position of the dot on the joystick.</td>
      <td>The value varies from -7 to 7.</td>
    </tr>
    <tr>
      <td>getYaxis()</td>
      <td>float</td>
      <td>The function returns the y position of the dot on the joystick.</td>
      <td>The value varies from -7 to 7.</td>
    </tr>
  </tbody>
</table>
<h4><strong>Code Explanation</strong></h4>
<p>The example code present in the library shows all the functions that can be used in getting different parameters transmitted from Gamepad. To explain this data received from the various function is printed on Serial Monitor.</p>
<p><a href="https://ai.thestempedia.com/wp-content/uploads/2022/08/esp32Output-1.png"><img src="https://ai.thestempedia.com/wp-content/uploads/2022/08/esp32Output-1.png" alt="esp32Output-1" width="600" height="292"></a></p>
<h2>Conclusion</h2>
<p>In conclusion, Dabble App is a great way to transform your Smartphone into a virtual I/O device and lets you control hardware using Bluetooth, communicate with it, and access sensors like the accelerometer, GPS, proximity, and other features of your Smartphone. You can use Dabble with Arduino Uno-Mega-Nano, ESP32, and evive and write code in Arduino IDE or PictoBlox (graphical programming based on Scratch 3.0). With this guide, you should now have a better understanding of the required hardware/modules, wiring diagram, connecting the board/Bluetooth module with mobile, and how to use Dabble library/extension.</p>
<p>Table of Contents</p>
<ol>
  <li>
    <p><a href="#elementor-toc__heading-anchor-0">Introduction</a></p>
    <ol>
      <li>
        <p><a href="#elementor-toc__heading-anchor-1">Supported Development Boards</a></p>
      </li>
      <li>
        <p><a href="#elementor-toc__heading-anchor-2">Supported Bluetooth Modules</a></p>
      </li>
    </ol>
  </li>
  <li>
    <p><a href="#elementor-toc__heading-anchor-3">Hardware Setup</a></p>
    <ol>
      <li>
        <p><a href="#elementor-toc__heading-anchor-4">evive</a></p>
      </li>
      <li>
        <p><a href="#elementor-toc__heading-anchor-5">Arduino Uno</a></p>
      </li>
      <li>
        <p><a href="#elementor-toc__heading-anchor-6">Arduino Mega</a></p>
      </li>
      <li>
        <p><a href="#elementor-toc__heading-anchor-7">Arduino Nano</a></p>
      </li>
      <li>
        <p><a href="#elementor-toc__heading-anchor-8">ESP32</a></p>
      </li>
    </ol>
  </li>
  <li>
    <p><a href="#elementor-toc__heading-anchor-9">Install Dabble in your Smartphone</a></p>
  </li>
  <li>
    <p><a href="#elementor-toc__heading-anchor-10">Connecting Dabble with Hardware</a></p>
  </li>
  <li>
    <p><a href="#elementor-toc__heading-anchor-11">Programming the boards</a></p>
    <ol>
      <li>
        <p><a href="#elementor-toc__heading-anchor-12">Arduino IDE - For evive, Arduino Uno, Nano and Mega</a></p>
        <ol>
          <li>
            <p><a href="#elementor-toc__heading-anchor-13">Get Dabble Library for your Hardware</a></p>
          </li>
          <li>
            <p><a href="#elementor-toc__heading-anchor-14">Flash code to your Board</a></p>
          </li>
          <li>
            <p><a href="#elementor-toc__heading-anchor-15">Header</a></p>
          </li>
          <li>
            <p><a href="#elementor-toc__heading-anchor-16">Enabling Bluetooth Communication</a></p>
          </li>
          <li>
            <p><a href="#elementor-toc__heading-anchor-17">Refreshing the data</a></p>
          </li>
          <li>
            <p><a href="#elementor-toc__heading-anchor-18">Functions</a></p>
          </li>
        </ol>
      </li>
      <li>
        <p><a href="#elementor-toc__heading-anchor-19">PictoBlox (Scratch) - For evive, ESP32, Arduino Uno, Nano, and Mega</a></p>
        <ol>
          <li>
            <p><a href="#elementor-toc__heading-anchor-20">Enabling Dabble Extension in PictoBlox</a></p>
          </li>
          <li>
            <p><a href="#elementor-toc__heading-anchor-21">Example - Enabling LED Control</a></p>
          </li>
        </ol>
      </li>
      <li>
        <p><a href="#elementor-toc__heading-anchor-22">Arduino IDE - For ESP32</a></p>
        <ol>
          <li>
            <p><a href="#elementor-toc__heading-anchor-23">Functions</a></p>
          </li>
          <li>
            <p><a href="#elementor-toc__heading-anchor-24">Code Explanation</a></p>
          </li>
        </ol>
      </li>
    </ol>
  </li>
  <li>
    <p><a href="#elementor-toc__heading-anchor-25">Conclusion</a></p>
  </li>
</ol>

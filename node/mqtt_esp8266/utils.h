// #include <Arduino.h>
// #include <string.h>

int parseCSV(char *inputString, int *outputArray, int outputArraySize)
{
    char *pch;
    int val = 0;
    int index_serial_data = 0;
    pch = strtok(inputString, ",");

    while (pch != NULL && pch != "\n")
    {
        //        sscanf (pch, "%d", &val);
        val = String(pch).toInt();
        outputArray[index_serial_data] = val;
        index_serial_data++;
        if (index_serial_data == outputArraySize)
        {
            break;
        }
        pch = strtok(NULL, ",");
    }
    return index_serial_data;
}
#include <stdio.h>

int main() {
    FILE *file;
    int array1[1000], array2[1000];
    int index = 0;

    // Open the file for reading
    file = fopen("day1.txt", "r");

    // Read the data into two arrays
    while (fscanf(file, "%d %d", &array1[index], &array2[index]) == 2) {
        index++;
        if (index >= 1000) {
            break;
        }
    }

    fclose(file);

    // sort arrays
    int temp;

    for (int i = 0; i < 1000; i++){
        for (int j = 0; j < 999; j++){
            if (array1[j] > array1[j + 1]){
                temp = array1[j];
                array1[j] = array1[j + 1];
                array1[j + 1] = temp;
            }
        }
    }
    for (int i = 0; i < 1000; i++){
        for (int j = 0; j < 999; j++){
            if (array2[j] > array2[j + 1]){
                temp = array2[j];
                array2[j] = array2[j + 1];
                array2[j + 1] = temp;
            }
        }
    }

    int sum = 0;
    int difference;

    for (int i = 0; i < 1000; i++){
        difference = array2[i] - array1[i];

        if (difference < 0){
            difference = difference * -1;
        }

        sum = sum + difference;
    }

    printf ("\n%d\n\n", sum);

    return 0;
}
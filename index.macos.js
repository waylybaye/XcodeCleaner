/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';

import { 
  AppRegistry, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Button,
  NativeModules
} from 'react-native';


const {FileManager} = NativeModules;


export default class XcodeCleaner extends Component {
  async componentDidMount(){
    console.log('FileManager', FileManager);
    let home = await FileManager.getHomeDirectory();
    console.log('home', home);
    let xcode = `${home}/Library/Developer/`;

    console.log('folders in ', xcode);
    console.log(await FileManager.listDirectory(xcode, true));

    let folder = xcode + 'Shared';
    console.log('calculating folder size');
    console.log(await FileManager.getDirectorySize(folder));
  }

  render() {
    let groups = [
      {
        name: 'iOS DeviceSupport', 
        description: 'Clear this is safe.',
        size: '40 G',
      },
      {
        name: 'DerivedData', 
        description: 'Clear this is safe.',
        size: '40 G',
      },
{
        name: 'Archives', 
        description: 'Clear this is safe.',
        size: '40 G',
      }
    ];

    return (
      <View style={styles.container}>
      <View style={{alignItems: 'center',}}>
        <Text style={styles.title}> Xcode Cleaner </Text>
      </View> 

        {groups.map((item, idx) => {
          return (
            <View style={styles.row} key={'group' + idx}>
            <View style={styles.rowLeft}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.description}>{item.description}</Text>
            </View>

            <View style={styles.rowRight}>
              <Text style={styles.size}> 40 G </Text>
              <Button title="Delete" />
              {/*
              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
               */}
            </View>
          </View>  
          )
        })}
      </View>
    );
  }
}

// const backgroundColor = 'rgb(17,29,38)';
// const cardBackground = 'rgb(22,41,53)';
// const textColor = 'rgb(251,252,253)';

// const backgroundColor = '#878ECD';
// const cardBackground = '#B9BBDF';
// const textColor = '#878ecd';
// const positive = 'rgb(0, 162,235)';

const backgroundColor = '#2E3B3E';
const cardBackground = '#50666B';
const textColor = '#F9B8BE';
const positive = '#FD6378';




const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: backgroundColor,
  },
  row: {
    backgroundColor: cardBackground,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 1,
    borderBottomWidth: 1,
    borderWidth: 2,
    borderColor: '#fff',
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flex: 1,
  },
  rowRight: {
    width: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    color: textColor,
    marginBottom: 15,
  },
  size: {
    fontSize: 30,
    color: positive,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  button: {
    borderWidth: 1,
    borderColor: '#fff',
  },
  buttonText: {
    fontSize: 20,
    color: positive,
  },
  title: {
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
    fontWeight: 'bold',
    // color: textColor,
    color: '#fff',
  },
  description: {
    color: textColor,
  },
});

AppRegistry.registerComponent('XcodeCleaner', () => XcodeCleaner);

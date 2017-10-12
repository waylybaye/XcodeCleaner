/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';

import { 
  AppRegistry, 
  FlatList,
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ProgressViewIOS,
  Button,
  NativeModules,
  ActivityIndicator,
} from 'react-native';


const {FileManager} = NativeModules;

function removePrefix(fullpath, path){
  let endingSlash = path[path.length - 1] === '/';
  return fullpath.substr(endingSlash ? path.length : path.length + 1);
}

export default class XcodeCleaner extends Component {
  constructor(props){
    super(props);

    this.state = {
      data: {},
      progress: {},
      tab: '',
    };
  }

  async componentDidMount(){
    this.calculateXcode();
  }

  updateProgress(section, current, total){
    this.setState({
      progress: {
        ...this.state.progress,
        [section]: [current, total]
      },
    })
  }

  async calculateSubDirectory(path, progressKey, labelGetter) {
    console.log('calculate Path', path);
    let folders = await FileManager.listDirectory(path, true);

    let totalSize = 0;
    let groups = [];
    this.updateProgress(progressKey, 0, folders.length);

    for(let i=0; i<folders.length; i++){
      let folder = folders[i];
      let label = removePrefix(folder, path);

      if (labelGetter){
        label = await labelGetter(folder);
      }
      let size = await FileManager.getDirectorySize(folder);
      totalSize += size;

      groups.push({
        label: label,
        size: size,
      });

      this.updateProgress(progressKey, i + 1, folders.length);
    }

    this.setState({
      data: {
        ...this.state.data,
        [progressKey]: {
          groups: groups,
        }
      }
    })

    return groups;
  }

  async calculateXcode() {
    let home = await FileManager.getHomeDirectory();
    let developer = `${home}/Library/Developer/`;
    let xcode = developer + 'Xcode/';

    await this.calculateSubDirectory(xcode + 'iOS DeviceSupport/', 'deviceSupport');
    await this.calculateSubDirectory(xcode + 'DerivedData/', 'derivedData');
    await this.calculateSubDirectory(xcode + 'Archives/', 'archives');
    await this.calculateSubDirectory(developer + 'CoreSimulator/Devices/', 'simulator');
  }

  renderItem(item){
    return (
      <View style={styles.row}>
        <Text>{item.label}</Text>
        <Text>{item.size}</Text>
      </View>  
    )
  }

  toggleTab(tab){
    this.setState({
      tab: this.state.tab === tab ? null : tab,
    });
  }

  render() {
    let groups = [
      {
        name: 'iOS DeviceSupport', 
        key: 'deviceSupport',
        description: 'Clear this is safe.',
      },
      {
        name: 'DerivedData', 
        key: 'derivedData',
        description: 'Clear this is safe.',
      },
      {
        key: 'archives',
        name: 'Archives', 
        description: 'Clear this is safe.',
      },
      {
        key: 'simulator',
        name: 'CoreSimulator', 
        description: 'Clear this is safe.',
      }
    ];


    return (
      <View style={styles.container}>
      <View style={{alignItems: 'center',}}>
        <Text style={styles.title}> Xcode Cleaner </Text>
      </View> 

        {groups.map((item, idx) => {
          let data = this.state.data[item.key] || {};
          let progress = this.state.progress[item.key];
          let progressValue = 0;

          if (progress){
            let current = progress[0];
            let total = progress[1];
            progressValue = total === 0 ? 1 : (current / total);
          }

          return (
            <View style={styles.section} key={'group' + idx}>
              <TouchableOpacity onPress={() => this.toggleTab(item.key)}>
                <View style={styles.row}>

                  <View style={styles.rowLeft}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.description}>{item.description}</Text>
                    {progress && progressValue < 1 ? <ProgressViewIOS progress={progressValue} /> : null }
                  </View>

                  <View style={styles.rowRight}>
                    <ActivityIndicator size='large' color='white' animating={true} />
                    {data.size ? (
                    <Text style={styles.size}> {data.size} </Text>
                    ) : null}
                    <Button title="Delete" />
                    {/*
                    <TouchableOpacity style={styles.button}>
                      <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                    */}
                  </View>
                </View>  
              </TouchableOpacity>

              {this.state.tab === item.key ? (
                <FlatList
                  data={data.groups}
                  renderItem={({item}) => this.renderItem(item)}
                  />
              ) : null}
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
// const textColor = '#F9B8BE';
// const positive = '#FD6378';

const textColor = '#333';
const positive = 'blue';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: backgroundColor,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 1,
    borderBottomWidth: 1,
    // backgroundColor: cardBackground,
    // borderWidth: 2,
    // borderColor: '#fff',
    // borderBottomColor: '#eee',
  },
  row: {
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

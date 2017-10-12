/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';

import { 
  AppRegistry, 
  Dimensions,
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
const window = Dimensions.get('window');
console.log('windowSize', window);
console.log('windowSize', Dimensions.get('screen'));
// console.log('windowSize', Dimensions.get('app'));

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
        path: folder,
        label: label,
        size: size,
      });

      this.updateProgress(progressKey, i + 1, folders.length);
    }

    this.setState({
      data: {
        ...this.state.data,
        [progressKey]: {
          size: totalSize,
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

  async trashDirectory(groupKey, item) {
    let path = item.path;

    if (path){
      try{
        // await FileManager.trashDirectory(path);
        let group = this.state.data[groupKey];
        let index = group.groups.indexOf(item);

        if (!group || index === -1){
          return;
        }

        let groups = group.groups.slice();
        groups.splice(index, 1)

        this.setState({
          data: {
            ...this.state.data,
            [groupKey]: {
              size: group.size - item.size,
              groups: groups,
            }
          }
        })

      } catch (e){
        console.log('errrr', e);
      }
    }
  }

  renderItem(item, groupKey){
    return (
      <View style={styles.listItem}>
        <Text style={styles.itemLabel}>{item.label}</Text>
        <Text style={styles.itemSize}>{item.size}</Text>
        <Button 
          title='' 
          onPress={() => FileManager.revealInFinder(item.path)}
          bezelStyle='helpButton' />
        <Button 
          title='Trash' 
          onPress={() => this.trashDirectory(groupKey, item)}
           />
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
        description: 'Only need to keep the latest iOS version.',
      },
      {
        name: 'DerivedData', 
        key: 'derivedData',
        description: "It's safe to clear entire folder.",
      },
      {
        key: 'archives',
        name: 'Archives', 
        description: "You can't debug crash logs if you removed old archives.",
      },
      {
        key: 'simulator',
        name: 'CoreSimulator', 
        description: "It's safe to remove unused simulators.",
      }
    ];

                    // <ActivityIndicator size='large' color='white' animating={true} />

    return (
      <View style={styles.container}>
        <View style={{alignItems: 'center',}}>
          <Text style={styles.title}> Xcode Cleaner </Text>
        </View> 

        {groups.map((group, idx) => {
          let data = this.state.data[group.key] || {};
          let progress = this.state.progress[group.key];
          let progressValue = 0;

          if (progress){
            let current = progress[0];
            let total = progress[1];
            progressValue = total === 0 ? 1 : (current / total);
          }
          let compactMode = this.state.tab && this.state.tab !== group.key;

          return (
            <View style={[
              styles.section,
              this.state.tab && this.state.tab !== group.key && styles.inactiveTab,
              this.state.tab && this.state.tab === group.key && styles.activeTab,
            ]} key={'group' + idx}>
              <TouchableOpacity onPress={() => this.toggleTab(group.key)}>
                <View style={[
                  styles.row, 
                  styles.sectionHeader,
                ]}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.name}>{group.name}</Text>
                    {!compactMode && <Text style={styles.description}>{group.description}</Text> }
                  </View>

                  <View style={styles.rowRight}>
                    <Button 
                      title='' 
                      onPress={() => FileManager.revealInFinder(group.path)}
                      bezelStyle='helpButton' />
                    {data.size ? (
                    <Text style={styles.size} 
                          > {data.size} </Text>
                    ) : null}
                    {/*
                    // <Button title="Delete" />
                    <TouchableOpacity style={styles.button}>
                      <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                    */}
                  </View>
                </View>  
              </TouchableOpacity>

              {progress && progressValue < 1 ? <ProgressViewIOS progress={progressValue} /> : null }

              {this.state.tab === group.key ? (
                <FlatList
                  contentContainerStyle={styles.listContainer}
                  style={styles.list}
                  data={data.groups}
                  keyExtractor={(item, index) => item.path}
                  renderItem={({item}) => this.renderItem(item, group.key)}
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

// const backgroundColor = '#2E3B3E';
// const cardBackground = '#50666B';
// const textColor = '#F9B8BE';
// const positive = '#FD6378';

const backgroundColor = 'transparent'
// const cardBackground= 'rgb(255,78,93)'
const cardBackground= 'transparent'
const textColor = '#333';
const secondaryTextColor = '#888';
const positive = 'blue';
// const fontFamily = 'sans-serif';
const fontFamily = 'HelveticaNeue';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: backgroundColor,
  },
  section: {
    borderRadius: 10,
    marginHorizontal: 20,
    paddingVertical: 20,
    // marginBottom: 1,
    // borderBottomWidth: 1,
    // backgroundColor: 'yellow',
    backgroundColor: cardBackground,
    // borderWidth: 2,
    // borderColor: '#fff',
    // borderBottomColor: '#eee',
  },
  sectionHeader: {
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
    fontSize: 18,
    color: textColor,
    // color: backgroundColor,
    fontFamily: fontFamily,
    marginBottom: 15,
  },
  description: {
    fontSize: 12,
    color: secondaryTextColor,
    fontFamily: fontFamily,
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
    fontFamily: fontFamily,
    // color: textColor,
    color: '#333',
  },
  list: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#888',
  },
  listContainer: {
    backgroundColor: '#fff',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  itemLabel: {
    flex: 1,
    fontSize: 12,
  },
  itemSize: {
    fontSize: 12,
  },
  activeTab: {
    flex: 1,
  },
  inactiveTab: {
    height: 40,
  }
});

AppRegistry.registerComponent('XcodeCleaner', () => XcodeCleaner);

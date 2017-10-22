/**
 * Xcode Cleaner by waylybaye
 * https://github.com/waylybaye/XcodeCleaner
 * @flow
 */

import React, { Component } from 'react';

import { 
  AlertIOS,
  AppRegistry, 
  Dimensions,
  FlatList,
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ProgressViewIOS,
  Button,
  Image,
  NativeModules,
  ActivityIndicator,
  LayoutAnimation,
} from 'react-native';


const {FileManager} = NativeModules;

function removePrefix(fullpath, path){
  let endingSlash = path[path.length - 1] === '/';
  return fullpath.substr(endingSlash ? path.length : path.length + 1);
}


function humanize(value, decimal) {
  value = value || 0;
  let i = -1;
  let byteUnits = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  do {
    value = value / 1024;
    i++;
  } while (value > 1024);

  return value.toFixed(decimal || 0) + byteUnits[i][0];
}

const STRINGS = {
  'xcode_not_found_title': 'Xcode not found',
  'xcode_not_found_body': "No Xcode installation found in selected directory, it's usually at HOME/Library/Developer."
};


export default class XcodeCleaner extends Component {
  constructor(props){
    super(props);

    this.state = {
      data: {},
      progress: {},
      tab: '',
    };
  }

  componentWillMount(){
    LayoutAnimation.easeInEaseOut();
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
    let folders = [];
    try{
      folders = await FileManager.listDirectory(path, true);
    } catch (e){
      this.updateProgress(progressKey, 0, 0);
      this.setState({
        data: {
          ...this.state.data,
          [progressKey]: {
            size: 0,
            groups: [],
          }
        }
      });
      return;
    }

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

      groups.sort(function(a, b){
        return b.size - a.size;
      });

      this.setState({
        data: {
          ...this.state.data,
          [progressKey]: {
            size: totalSize,
            groups: groups,
          }
        }
      })
    }

    if (progressKey === 'simulator'){
      for(let i=0; i<groups.length; i++){
        try{
          let simulator = groups[i];
          let simulatorPath = simulator.path;
          let contents = await FileManager.parsePlist(simulatorPath + '/device.plist');

          name = contents.name || contents.UDID;
          runtime = (contents.runtime || '').split('.');
          version = runtime[runtime.length - 1];
          version = version.replace(/(\d+)-/g, '$1.').replace(/-/, ' ');

          simulator.label = `${name} (${version})`;
        } catch (e){
          console.log('error', e);
          continue;
        }
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
    }

    return groups;
  }

  async calculateXcode(chooseManaually) {
    let home = await FileManager.getHomeDirectory();
    console.log('home', home);
    let sandboxPrefix = '/Library/Containers/';

    if ( home.search(sandboxPrefix) !== -1 ){
      // App is run in sandbox
      home = home.substr(0, home.indexOf(sandboxPrefix));
    } 

    let developer = `${home}/Library/Developer/`;
    console.log('develoepr', developer);
    let authorizedPath = developer;

    try{
      authorizedPath = await FileManager.authorize(chooseManaually ? '' : developer) || '';
      if (authorizedPath[authorizedPath.length - 1] !== '/'){
        authorizedPath += '/';
      }
      console.log('authorizedPath', authorizedPath);
    } catch (e){
      alert(e.userInfo ? e.userInfo.NSLocalizedDescription : e.message);
      return;
    }

    
    let xcode = authorizedPath + 'Xcode/';
    let type = await FileManager.exists(xcode);
    if (type === 0){
      AlertIOS.alert(
        STRINGS.xcode_not_found_title,
        STRINGS.xcode_not_found_body,
        [
          {text: 'Cancel', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
          {text: 'Choose Directory ...', onPress: () => this.calculateXcode(true)},
        ],
      );

      return;
    }

    await this.calculateSubDirectory(xcode + 'iOS DeviceSupport/', 'deviceSupport');
    await this.calculateSubDirectory(xcode + 'DerivedData/', 'derivedData');
    await this.calculateSubDirectory(xcode + 'Archives/', 'archives');
    await this.calculateSubDirectory(authorizedPath + 'CoreSimulator/Devices/', 'simulator');
  }

  async componentWillUnmount(){
    let home = await FileManager.getHomeDirectory();
    let developer = `${home}/Library/Developer/`;
    await FileManager.stopAuthorization(developer);
  }

  async trashDirectory(groupKey, item) {
    let path = item.path;

    if (path){
      try{
        await FileManager.trashDirectory(path);
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
        <Text style={styles.itemSize}>{humanize(item.size, 1)}</Text>
        <Button 
          // title='Reveal' 
          style={{width: 30}}
          image={{uri: 'search'}}
          onPress={() => FileManager.revealInFinder(item.path)}
          bezelStyle='circular' 
          />
        <Button 
          style={{
            width: 30,
            margin: 0,
          }}
          title='' 
          bezelStyle='circular' 
          image={{uri: 'trash'}}
          onPress={() => this.trashDirectory(groupKey, item)}
           />
      </View>  
    )
  }

  toggleTab(tab){
    LayoutAnimation.easeInEaseOut();
    this.setState({
      tab: this.state.tab === tab ? null : tab,
    });
  }

  render() {
    let groups = [
      {
        name: 'iOS DeviceSupport', 
        key: 'deviceSupport',
        description: 'Only need to keep the latest iOS version, feel free to remove old versions.',
      },
      {
        name: 'DerivedData', 
        key: 'derivedData',
        description: "It's safe to clear the entire folder, but you'll need to rebuild your projects after removal.",
      },
      {
        key: 'archives',
        name: 'Archives', 
        description: "You can't debug deployed versions if you remove old archives.",
      },
      {
        key: 'simulator',
        name: 'CoreSimulator', 
        description: "Your apps' data are stored here. I suggest you run `xcrun simctl delete unavailable` to reduce the size safely.",
      }
    ];


    return (
      <View style={styles.container}>
        <View style={[styles.row, styles.header]}>
          <Image 
            source={{uri: 'AppIcon.icns'}}  
            style={{width: 40, height: 40}}/>

          <Text style={styles.title}> Cleaner for Xcode </Text>
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

          let count = data.groups ? data.groups.length : 0;
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
                    <View style={styles.headerWithBadge}>
                      <Text style={[styles.name, compactMode ? styles.compactName : null]}>{group.name}</Text>
                      {count ? <Button title={count + ''} bezelStyle='rounded' type='momentaryLight' /> : null}
                    </View>
                    {!compactMode && <Text style={styles.description}>{group.description}</Text> }
                  </View>

                  <View style={styles.rowRight}>
                    {data.size ? (
                      <Text style={styles.size}> {humanize(data.size || 0)} </Text>
                    ) : null}
                  </View>
                </View>  
              </TouchableOpacity>

              <View style={{height: 20}}>
                {progress && progressValue < 1 ? <ProgressViewIOS progressTintColor={sizeColor} progress={progressValue} /> : null }
              </View>

              {this.state.tab === group.key ? (
                <FlatList
                  contentContainerStyle={styles.listContainer}
                  // showsVerticalScrollIndicator={true}
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


const backgroundColor = 'transparent'
const cardBackground= 'transparent'
const textColor = '#333';
const secondaryTextColor = '#888';
const positive = 'blue';
// const fontFamily = 'HelveticaNeue';
const marginHorizontal = 20;
const sizeColor = 'rgb(255,78,93)';


const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: backgroundColor,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginHorizontal: marginHorizontal,
    borderColor: sizeColor,
  },
  section: {
    borderRadius: 10,
    marginHorizontal: marginHorizontal,
    paddingVertical: 20,
  },
  sectionHeader: {
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flex: 1,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  rowRight: {
    width: 100,
    alignItems: 'flex-end',
  },
  name: {
    fontSize: 18,
    color: textColor,
    // fontFamily: fontFamily,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 12,
    color: secondaryTextColor,
    lineHeight: 20,
  },

  size: {
    fontSize: 30,
    color: positive,
    fontWeight: 'bold',
    color: sizeColor,
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
    fontSize: 15,
    textAlign: 'center',
    margin: 20,
    fontWeight: 'bold',
    // fontFamily: fontFamily,
    color: '#888',
  },
  list: {
    borderRadius: 8,
    // borderWidth: 1,
    // borderColor: '#444',
  },
  listContainer: {
    backgroundColor: '#fff',
    padding: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemLabel: {
    color: secondaryTextColor,
    flex: 1,
    fontSize: 12,
  },
  itemSize: {
    fontSize: 12,
    marginRight: 10,
  },
  activeTab: {
    flex: 1,
  },
  inactiveTab: {
    height: 50,
  },

  compactSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: marginHorizontal,
    borderWidth: 1,
    alignItems: 'center',
  },
  headerWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 20,
    marginBottom: 10,
  },
  compactName: {
    // color: secondaryTextColor,
    // fontWeight: 'normal',
  },
});

AppRegistry.registerComponent('XcodeCleaner', () => XcodeCleaner);

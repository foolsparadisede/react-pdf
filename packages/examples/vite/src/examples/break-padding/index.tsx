import React, { Fragment } from "react";
import { Document, Page, Text, View } from '@react-pdf/renderer';

const MyDoc = () => {
  return (
    <Page size="A4">
      <View debug={true} style={{height: '20mm', backgroundColor: 'lightblue'}}></View>
      <View debug={true} style={{height: '20mm', backgroundColor: 'lightblue'}}></View>
      <View debug={true} break={true} style={{height: '20mm', backgroundColor: 'lightblue'}}></View>
      <View style={{height: '22mm'}} debug={true}>
      </View>

        <View debug={true} style={{height: '20mm', backgroundColor: 'lightblue'}}></View>
      <View debug={true} style={{height: '20mm', backgroundColor: 'lightblue'}}></View>
      <View debug={true} style={{height: '20mm', backgroundColor: 'lightblue'}}></View>

        <Text fixed={true} wrap={false} style={{padding: '20mm', backgroundColor: 'red', marginBottom: "0mm"}} debug={true} >Im a header</Text>
        <View debug={true}>
          {new Array(4).fill("first Hello world from client Hello world from client Hello world from client Hello world from client").map((text, index) => <Fragment key={index}><Text debug={true} wrap={false} style={{padding: '10mm', marginTop: "5mm", ...(index % 2 ? {backgroundColor: 'blue'} : {backgroundColor: 'green'})}}>{`${index} ${text}`}</Text></Fragment>)}
        </View>
      {/*<View>*/}
      {/*  <Text fixed={true} wrap={false} style={{padding: '20mm', backgroundColor: 'red'}} debug={true} >Im a header 2</Text>*/}
      {/*  <View>*/}
      {/*    {new Array(8).fill("second Hello world from client Hello world from client Hello world from client Hello world from client").map((text, index) => <Fragment key={index}><Text wrap={false} style={{padding: '10mm', ...(index % 2 ? {backgroundColor: 'blue'} : {backgroundColor: 'green'})}}>{`${index} ${text}`}</Text></Fragment>)}*/}
      {/*  </View>*/}
      {/*</View>*/}


      <View fixed={true} wrap={false} style={{bottom: 0, left: 0, width: '100%', backgroundColor: 'red'}}>
        <Text style={{padding: '10mm'}}>asdf</Text>
        <Text>asdf</Text>
        <Text>asdf</Text>
        <Text>asdf</Text>
      </View>



    </Page>
  );
};

const BreakPadding = () => {
  return (
    <Document>
      <MyDoc />
    </Document>
  );
};

export default {
  id: 'break-padding',
  name: 'Break Padding',
  description: '',
  Document: BreakPadding,
};

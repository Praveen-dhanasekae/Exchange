region="$1"
LOGFILE="/metlife/runtime/content/eDPMBatch/dump_data/ADedpm/data/eDPM_DeleteParty.log"
export DB2_BIN=/home/udbcli01/sqllib/bin
inDate=`date +%Y%m%d`
outdata=$datadir/BHFPreferenceExport_$inDate.dat

cd /metlife/runtime/content/eDPMBatch/dump_data/ADedpm/

for filename in $(find /metlife/runtime/content/eDPMBatch/dump_data/ADedpm/data/ -name "*.PreferenceExport.txt"); do
        echo Filename is : $filename

if [[ -s $filename ]];
	then
  	echo Input file is $filename | tee -a $LOGFILE
	else
	echo   No Input file Found. | tee -a $LOGFILE
fi

if  [ $region = Prod ]
then  
	rundir=/metlife/runtime/content/eDPMBatch/dump_data/ADedpm
else
	rundir=/metlife/runtime/content/eDPMBatch/dump_data/ADedpm              
fi

echo Run directory is $rundir

cd $rundir

if [ $region = Prod ] 
then
	edpm_DBName=$(cat $rundir/DIM.ini | grep 'edpm_prod_Database_Name' | cut -f2 -d =)
	edpm_UserId=$(cat $rundir/DIM.ini | grep 'edpm_prod_Database_UserID' | cut -f2 -d =)
	edpm_Passwd=$(cat $rundir/DIM.ini | grep 'edpm_prod_Database_Password' | cut -f2 -d =)
	schema=$(cat $rundir/DIM.ini | grep 'edpm_prod_Database_Schema_Name' | cut -f2 -d =)
else 
	edpm_DBName=$(cat $rundir/DIM.ini | grep 'edpm_Database_Name' | cut -f2 -d =)
	edpm_UserId=$(cat $rundir/DIM.ini | grep 'edpm_Database_UserID' | cut -f2 -d =)
	edpm_Passwd=$(cat $rundir/DIM.ini | grep 'edpm_Database_Password' | cut -f2 -d =)
	schema=$(cat $rundir/DIM.ini | grep 'edpm_Database_Schema_Name' | cut -f2 -d =)
fi

echo edpm_DBName is $edpm_DBName | tee -a $LOGFILE
echo edpm_UserId is $edpm_UserId | tee -a $LOGFILE

$DB2_BIN/db2 "connect to $edpm_DBName user $edpm_UserId using $edpm_Passwd";
edpm_Connect=$?

if [ $edpm_Connect -ne 0 ]
then
     echo Error connecting to edpm database. Ret Code - $edpm_Connect | tee -a $LOGFILE
     echo edpm DBName : $edpm_DBName
     echo edpm UserId : $edpm_UserId
      exit $edpm_Connect
else
	echo connecting to edpm database Successfull. Ret Code - $edpm_Connect | tee -a $LOGFILE
fi

echo $schema

while read line
do 
   origin= ($line | cut -d "-" -f 1 );
   value =  ($line | cut -d "-" -f 2 );
   $DB2_BIN/db2 (select trim(party.party_frst_nm) as FirstName, trim(party.party_lst_nm) as LastName, trim(party.party_tin_num) as tin, case when (case when cnsnt.USR_CNSNT_CHS_IND is null then trim(char(party.elec_cnsnt_ind)) else trim(char(cnsnt.USR_CNSNT_CHS_IND)) end)=0 then 'FALSE'when (case when cnsnt.USR_CNSNT_CHS_IND is null then trim(char(party.elec_cnsnt_ind)) else trim(char(cnsnt.USR_CNSNT_CHS_IND)) end)=1 then 'TRUE' end as eConsent,trim(email.chnl_adr_txt) as PrimaryEmailID, (SELECT sec.chnl_adr_txt FROM IBEDPT1.t_cntct_chnl sec WHERE sec.ID = adtlCnt.CNTCT_CHNL_ID) as additional_EmailID,trim(pref.prod_typ_cd) as productType, trim(pref.doc_ctgy_cd) as documentCategory, case when trim(char(pref.doc_dlv_mthd_id)) = 0 then  'POST' when trim(char(pref.doc_dlv_mthd_id)) = 1 then  'ELECTRONIC'when trim(char(pref.doc_dlv_mthd_id)) = 2 then  'NONE' end as deliveryMethod from IBEDPT1.t_bus_party party left join IBEDPT1.T_PARTY_ID_XRFR xref on party.id = xref.BUS_PARTY_ID left join IBEDPT1.t_usr_cnsnt cnsnt on party.id = cnsnt.usr_party_id and cnsnt.CNSNT_TYP_TXT = 'eConsent'left outer join IBEDPT1.t_cntct_chnl email on party.PRI_CNTCT_CHNL_SEQ_ID = email.idleft outer join IBEDPT1.T_BUS_PARTY_CNTCT adtlCnt on party.id = adtlCnt.bus_party_id left outer join IBEDPT1.T_DOC_DLV_PRFR pref on party.id = pref.bus_party_id where xref.NTRL_PARTY_ID_ORIG_TXT = $origin and xref.NTRL_PARTY_ID_VAL = $value )>> $outdata
   
done < $filename


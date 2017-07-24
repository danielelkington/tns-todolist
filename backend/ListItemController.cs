using System;
using System.Collections.Generic;
using System.Web.Http;
using System.Data.SqlClient;
using System.Linq;
using System.IO;
using System.Xml.Linq;
using System.Xml;

namespace backend
{
    public class ListItemController : ApiController
    {
        private SqlConnection ConnectToDatabase()
        {
            //Get config file
            var result = string.Empty;
            using (var stream = this.GetType().Assembly.GetManifestResourceStream("backend.config.xml"))
            {
                using (var sr = new StreamReader(stream))
                    result = sr.ReadToEnd();
            }
            var resultXml = XDocument.Parse(result);
            var configXml = resultXml.Root;

            var builder = new SqlConnectionStringBuilder();
            builder.DataSource = (string)configXml.Element("DataSource");
            builder.UserID = (string)configXml.Element("UserId");
            builder.Password = (string)configXml.Element("Password");
            builder.InitialCatalog = "todolist";
            return new SqlConnection(builder.ConnectionString);
        }

        public IEnumerable<ListItem> Post(int lastSyncTime, IEnumerable<ListItem> items)
        {
            var existingItems = new List<ListItem>();
            using (var connection = ConnectToDatabase())
            {
                connection.Open();
                var transaction = connection.BeginTransaction();
                try
                {
                    //Get recently updated items that the client doesn't know about
                    var queryCommand = new SqlCommand("SELECT Id, Description, Complete, ModifiedUTC FROM ListItem WHERE ModifiedUTC > @mod", connection, transaction);
                    queryCommand.Parameters.Add(new SqlParameter("@mod", lastSyncTime));
                    var result = queryCommand.ExecuteReader();

                    while (result.Read())
                    {
                        var item = new ListItem();
                        item.Id = result.GetString(0);
                        item.Description = result.GetString(1);
                        item.Complete = result.GetBoolean(2);
                        item.ModifiedUTC = result.GetInt32(3);
                        //only include if it wasn't one of the ones being updated now.
                        if (!items.Any(x => x.Id.Equals(item.Id)))
                            existingItems.Add(item);
                    }
                    result.Close();

                    //Add or update other items
                    foreach (var item in items)
                    {
                        //Exists?
                        var existsCommand = new SqlCommand("SELECT COUNT(*) FROM ListItem WHERE Id = @id", connection, transaction);
                        existsCommand.Parameters.Add(new SqlParameter("@id", item.Id));
                        if (((int)existsCommand.ExecuteScalar()) > 0)
                        {
                            //Exists, update existing value
                            var updateCommand = new SqlCommand("UPDATE ListItem SET Description = @desc, Complete = @comp, ModifiedUTC = @mod WHERE Id = @id", connection, transaction);
                            updateCommand.Parameters.Add(new SqlParameter("@desc", item.Description));
                            updateCommand.Parameters.Add(new SqlParameter("@comp", item.Complete ? 1 : 0));
                            updateCommand.Parameters.Add(new SqlParameter("@mod", item.ModifiedUTC));
                            updateCommand.Parameters.Add(new SqlParameter("@id", item.Id));
                            updateCommand.ExecuteNonQuery();
                        }
                        else
                        {
                            //Doesn't exist, add new
                            var insertCommand = new SqlCommand("INSERT INTO ListItem(Id, Description, Complete, ModifiedUTC) VALUES(@id, @desc, @comp, @mod)", connection, transaction);
                            insertCommand.Parameters.Add(new SqlParameter("@desc", item.Description));
                            insertCommand.Parameters.Add(new SqlParameter("@comp", item.Complete ? 1 : 0));
                            insertCommand.Parameters.Add(new SqlParameter("@mod", item.ModifiedUTC));
                            insertCommand.Parameters.Add(new SqlParameter("@id", item.Id));
                            insertCommand.ExecuteNonQuery();
                        }
                    }

                    transaction.Commit();
                }
                catch(Exception e)
                {
                    transaction.Rollback();
                    throw;
                }
            }
            return existingItems;
        }
    }
}
